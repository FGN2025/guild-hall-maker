import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, supabaseServiceRole, requireAuth, okJson, toolError } from "./_shared.ts";
import { composePromoLayout, promoSceneToEditorTexts, PROMO_DIMENSIONS } from "../promo/composePromoLayout.ts";
import { PromoRenderError } from "../promo/renderPromo.ts";
import type { PromoScene } from "../promo/composePromoLayout.ts";

// Type-only declaration so the app typecheck (Node libs) accepts the Deno
// runtime global; erased at emit, no behaviour change in the edge runtime.
declare const Deno: { env: { get(key: string): string | undefined } };


/**
 * Rasterize one scene in a dedicated `promo-render` worker so the render gets
 * a CPU budget of its own. Any classified failure from the renderer is
 * re-thrown as a PromoRenderError so the tool reports a named cause instead of
 * an opaque worker error.
 */
async function renderViaWorker(scene: PromoScene, includeText: boolean, includeScrim = true): Promise<Uint8Array> {
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new PromoRenderError("render_worker_unconfigured", "promo-render worker is not reachable from this function.");

  // WORKER_RESOURCE_LIMIT (HTTP 546) is NOT an input defect. resvg's WASM
  // linear memory grows a few MB per render and never shrinks, and Supabase
  // reuses one worker instance across requests, so a render fails purely
  // because of how many renders that particular instance already served.
  // Measured locally: RSS 276.8 MB -> 307.1 MB over 8 identical renders, with
  // identical inputs and identical 768x1024 / ~1 MB cover art. Retrying lands
  // on a fresh instance, which is exactly why 5 of 7 abandoned beats succeeded
  // when the agent retried by hand — at the cost of a continuation each.
  // Retrying HERE keeps that cost inside one tool call instead of burning the
  // run's continuation budget, which is what killed the September seed.
  const RETRYABLE = new Set([546, 502, 503, 504]);
  const MAX_ATTEMPTS = 4;
  let last: PromoRenderError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`${base}/functions/v1/promo-render`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ scene, includeText, includeScrim }),
    });

    if (res.ok) {
      console.log(
        `[compose_event_promo] render includeText=${includeText} attempt=${attempt} ms=${res.headers.get("x-promo-ms")} bg=${res.headers.get("x-promo-background")}`,
      );
      return new Uint8Array(await res.arrayBuffer());
    }

    let payload: Record<string, unknown> = {};
    try { payload = await res.json(); } catch { payload = { message: await res.text().catch(() => "") }; }
    last = new PromoRenderError(
      String(payload.code ?? `render_worker_http_${res.status}`),
      String(payload.message ?? `promo-render returned ${res.status}`),
      { includeText, status: res.status, attempts: attempt, ...(payload.detail as Record<string, unknown> ?? {}) },
    );

    if (!RETRYABLE.has(res.status) || attempt === MAX_ATTEMPTS) throw last;
    // Backoff gives the platform time to retire the exhausted instance.
    const waitMs = 400 * attempt;
    console.warn(`[compose_event_promo] render retry ${attempt}/${MAX_ATTEMPTS - 1} after HTTP ${res.status}, waiting ${waitMs}ms`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw last ?? new PromoRenderError("render_worker_unknown", "promo-render failed with no classified cause.");
}


import { resolveEventArt } from "../promo/resolveEventArt.ts";


const BUCKET = "tenant-marketing";

export default defineTool({
  name: "compose_event_promo",
  title: "Compose a deterministic promo image from a published event",
  description:
    "Lane 1 (calendar-lane) composer. Layouts an event (tournament OR tenant event) with the tenant's brand color and beat label into a PNG using pure server-side rendering (no external image generation cost), uploads it into the tenant-marketing bucket, and inserts a tenant_marketing_assets draft row identical in shape to attach_tenant_asset_draft — including overlay_config so the draft opens in the editor as separately-editable text layers. Provide exactly one of tournament_id or event_id. CALL ONCE PER BEAT: the beat label is baked into the rendered graphic, so each scheduled post must use the url returned by the compose call for its own beat. Reusing one composed image across announce and day-of posts is a defect.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    tournament_id: z.string().uuid().optional(),
    event_id: z.string().uuid().optional(),
    format: z.enum(["portrait", "square", "landscape", "story"]).default("portrait"),
    beat_label: z.string().optional().describe(
      "The beat this render is for: 'Announce', 'Countdown', 'Day-Of', or 'Recap'. Baked into the image, so compose separately for every beat you schedule.",
    ),
    campaign_id: z.string().uuid().optional(),
    file_name: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      if (!!input.tournament_id === !!input.event_id) {
        return { content: [{ type: "text", text: "Provide exactly one of tournament_id or event_id." }], isError: true };
      }

      const userSupabase = supabaseForUser(ctx);
      const uid = ctx.getUserId();

      // Fetch event
      let evt: { id: string; name: string; game?: string | null; start_date?: string | null; prize_pool?: string | null; prize_type?: string | null; image_url?: string | null };
      if (input.tournament_id) {
        const { data, error } = await userSupabase
          .from("tournaments")
          .select("id, name, game, start_date, prize_pool, prize_type, image_url")
          .eq("id", input.tournament_id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return { content: [{ type: "text", text: "Tournament not found or not visible." }], isError: true };
        evt = data as any;
      } else {
        const { data, error } = await userSupabase
          .from("tenant_events")
          .select("id, name, game, start_date, prize_pool, prize_type, image_url, tenant_id")
          .eq("id", input.event_id!)
          .maybeSingle();
        if (error) throw error;
        if (!data) return { content: [{ type: "text", text: "Event not found or not visible." }], isError: true };
        if ((data as any).tenant_id !== input.tenant_id) {
          return { content: [{ type: "text", text: "Event does not belong to the supplied tenant_id." }], isError: true };
        }
        evt = data as any;
      }

      // Fetch tenant brand color
      const { data: tenant } = await userSupabase
        .from("tenants")
        .select("name, primary_color, accent_color")
        .eq("id", input.tenant_id)
        .maybeSingle();

      // Kept as a named value: it is both the render input AND what we persist
      // on the asset, so the editor can re-compose the copy block when a
      // reviewer switches aspect ratio instead of rescaling a fixed layout.
      const promoArgs = {
        event: {
          name: evt.name,
          game: evt.game ?? null,
          start_date: evt.start_date ?? null,
          prize_pool: evt.prize_pool ?? null,
          prize_type: evt.prize_type ?? null,
        },
        tenantName: (tenant as any)?.name ?? null,
        tenantPrimaryColor: (tenant as any)?.primary_color ?? null,
        tenantAccentColor: (tenant as any)?.accent_color ?? null,
        format: input.format,
        beatLabel: input.beat_label ?? null,
      };
      const scene = composePromoLayout(promoArgs);

      console.log(`[compose_event_promo] event=${evt.id} ${scene.titleNormalization.log}`);

      // Background art: event image -> game cover art -> branded plate.
      const art = await resolveEventArt(
        { image_url: evt.image_url ?? null, game: evt.game ?? null, name: evt.name },
        userSupabase,
      );
      scene.backgroundUrl = art.url;
      console.log(`[compose_event_promo] event=${evt.id} ${art.log}`);


      // Each raster goes to its own worker. One 1080x1350 render costs ~1.0-1.3s
      // of CPU and the edge CPU budget is ~2s per request, so rendering the
      // flattened promo AND the text-free editor plate in this request is what
      // used to kill the run on the larger formats/covers. This tool now spends
      // its own budget on DB and storage work only.
      const png = await renderViaWorker(scene, true);
      // Text-free plate: the editor uses this as its base image so the
      // overlay_config text layers hydrate as the ONLY copy of the text
      // (composing over the flattened render would double every string).
      // Scrim-free as well: the bottom gradient / copy panel / accent bar are
      // persisted in overlay_config and painted by the editor as a fixed layer,
      // so panning or zooming the artwork no longer drags the shadow with it.
      const platePng = await renderViaWorker(scene, false, false);



      // Storage upload — tenant-marketing bucket (composer output ingests via
      // the same path attach_tenant_asset_draft uses).
      const beat = (input.beat_label ?? "promo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "promo";
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
      const uuid = crypto.randomUUID();
      const path = `${input.tenant_id}/agent/${yyyy}/${mm}/promo-${evt.id}-${beat}-${uuid}.png`;
      const platePath = `${input.tenant_id}/agent/${yyyy}/${mm}/promo-${evt.id}-${beat}-${uuid}-plate.png`;

      const svcFallback = supabaseServiceRole;
      async function upload(p: string, bytes: Uint8Array) {
        const { error } = await userSupabase.storage.from(BUCKET).upload(p, bytes, {
          contentType: "image/png",
          upsert: false,
        });
        if (error) {
          const retry = await svcFallback().storage.from(BUCKET).upload(p, bytes, { contentType: "image/png", upsert: false });
          if (retry.error) throw retry.error;
        }
      }
      await upload(path, png);
      await upload(platePath, platePng);

      const signTtl = 60 * 60 * 24 * 365;
      async function sign(p: string): Promise<string> {
        const { data, error } = await userSupabase.storage.from(BUCKET).createSignedUrl(p, signTtl);
        if (!error && data?.signedUrl) return data.signedUrl;
        const retry = await svcFallback().storage.from(BUCKET).createSignedUrl(p, signTtl);
        if (retry.error || !retry.data?.signedUrl) throw error ?? retry.error;
        return retry.data.signedUrl;
      }
      const storedUrl = await sign(path);
      const plateUrl = await sign(platePath);


      const overlayConfig = {
        canvas: { format: scene.format, width: scene.width, height: scene.height },
        promo: promoArgs,
        scrimImageBg: !!scene.backgroundUrl,
        scrim: {
          startPct: (scene.backgroundUrl ? scene.imageScrim : scene.plateScrim).startPct,
          stops: (scene.backgroundUrl ? scene.imageScrim : scene.plateScrim).stops,
          copyPanel: scene.backgroundUrl ? scene.copyPanel : null,
          accentBar: scene.accentBar,
        },
        overlays: promoSceneToEditorTexts(scene).map((t) => ({
          id: crypto.randomUUID(),
          type: "text",
          text: t.text,
          // Absolute coords are at output resolution; xPct/yPct let the editor
          // hydrate correctly at its (smaller) working canvas size.
          x: t.x,
          y: t.y,
          xPct: t.xPct,
          yPct: t.yPct,
          fontSize: t.fontSize,
          color: t.color,
          fontFamily: t.fontFamily,
          fontWeight: t.fontWeight,
        })),
      };


      const fileName = input.file_name ?? `${evt.name} — ${(input.beat_label ?? "Promo")}.png`;
      const label = `${input.format.charAt(0).toUpperCase()}${input.format.slice(1)} ${scene.width}x${scene.height}`;

      const { data: row, error: insErr } = await userSupabase
        .from("tenant_marketing_assets")
        .insert({
          tenant_id: input.tenant_id,
          file_name: fileName,
          file_path: path,
          url: storedUrl,
          background_url: plateUrl,
          overlay_config: overlayConfig,
          label,
          campaign_id: input.campaign_id ?? null,
          is_published: false,
          agent_source: "claude-mcp",
          proposed_by: uid,
          created_by: uid,
          notes: [
            input.beat_label ? `Beat: ${input.beat_label}` : null,
            `Art: ${art.provenance}${art.matchedGameName ? ` (${art.matchedGameName}, ${art.matchMethod})` : ""}`,
          ].filter(Boolean).join(" · "),
        })
        .select()
        .single();
      if (insErr) throw insErr;

      return okJson({ ...row, art_provenance: art }, "asset");

    } catch (err) {
      if (err instanceof PromoRenderError) {
        // Loud and classified: the agent sees a named cause it can report or
        // route around, instead of the run dying on an opaque worker error.
        console.error(`[compose_event_promo] render_failed code=${err.code} ${err.message}`, err.detail);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "compose_event_promo failed while preparing the background art",
              code: err.code,
              message: err.message,
              detail: err.detail,
              hint: err.code === "WORKER_RESOURCE_LIMIT"
                ? "The render worker ran out of memory after several retries. This is worker-instance exhaustion (resvg WASM memory grows per render and never shrinks), not a defect in this event's art. Retry the beat; if it fails repeatedly, clear the event image_url so the composer falls back to the generated plate."
                : "The event's image_url or the game's cover_image_url is too large to compose. Replace it with art no larger than 4 MB, or clear it so the composer falls back to the generated plate.",

            }, null, 2),
          }],
          isError: true,
        };
      }
      return toolError(err, "compose_event_promo");
    }

  },
});
