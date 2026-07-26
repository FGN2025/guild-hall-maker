import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, supabaseServiceRole, requireAuth, okJson, toolError } from "./_shared.ts";
import { composePromoLayout, promoSceneToEditorTexts, PROMO_DIMENSIONS } from "../../../../src/lib/promo/composePromoLayout.ts";
import { renderPromoSceneToPng } from "../promo/renderPromo.ts";

const BUCKET = "tenant-marketing";

export default defineTool({
  name: "compose_event_promo",
  title: "Compose a deterministic promo image from a published event",
  description:
    "Lane 1 (calendar-lane) composer. Layouts an event (tournament OR tenant event) with the tenant's brand color and beat label into a PNG using pure server-side rendering (no external image generation cost), uploads it into the tenant-marketing bucket, and inserts a tenant_marketing_assets draft row identical in shape to attach_tenant_asset_draft — including overlay_config so the draft opens in the editor as separately-editable text layers. Provide exactly one of tournament_id or event_id.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    tournament_id: z.string().uuid().optional(),
    event_id: z.string().uuid().optional(),
    format: z.enum(["portrait", "square", "landscape", "story"]).default("portrait"),
    beat_label: z.string().optional().describe("e.g. 'Announce', 'Countdown', 'Day-Of', 'Recap'"),
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
      let evt: { id: string; name: string; game?: string | null; start_date?: string | null; prize_pool?: string | null; image_url?: string | null };
      if (input.tournament_id) {
        const { data, error } = await userSupabase
          .from("tournaments")
          .select("id, name, game, start_date, prize_pool, image_url")
          .eq("id", input.tournament_id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return { content: [{ type: "text", text: "Tournament not found or not visible." }], isError: true };
        evt = data as any;
      } else {
        const { data, error } = await userSupabase
          .from("tenant_events")
          .select("id, name, game, start_date, prize_pool, image_url, tenant_id")
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
        .select("primary_color")
        .eq("id", input.tenant_id)
        .maybeSingle();

      const scene = composePromoLayout({
        event: {
          name: evt.name,
          game: evt.game ?? null,
          start_date: evt.start_date ?? null,
          prize_pool: evt.prize_pool ?? null,
        },
        tenantPrimaryColor: (tenant as any)?.primary_color ?? null,
        format: input.format,
        beatLabel: input.beat_label ?? null,
      });
      scene.backgroundUrl = evt.image_url ?? null;

      const png = await renderPromoSceneToPng(scene);

      // Storage upload — tenant-marketing bucket (composer output ingests via
      // the same path attach_tenant_asset_draft uses).
      const beat = (input.beat_label ?? "promo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "promo";
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
      const uuid = crypto.randomUUID();
      const path = `${input.tenant_id}/agent/${yyyy}/${mm}/promo-${evt.id}-${beat}-${uuid}.png`;

      const { error: upErr } = await userSupabase.storage.from(BUCKET).upload(path, png, {
        contentType: "image/png",
        upsert: false,
      });
      if (upErr) {
        const svc = supabaseServiceRole();
        const retry = await svc.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: false });
        if (retry.error) throw retry.error;
      }

      const signTtl = 60 * 60 * 24 * 365;
      let storedUrl: string;
      const { data: signed, error: signErr } = await userSupabase.storage.from(BUCKET).createSignedUrl(path, signTtl);
      if (signErr || !signed?.signedUrl) {
        const svc = supabaseServiceRole();
        const retry = await svc.storage.from(BUCKET).createSignedUrl(path, signTtl);
        if (retry.error || !retry.data?.signedUrl) throw signErr ?? retry.error;
        storedUrl = retry.data.signedUrl;
      } else {
        storedUrl = signed.signedUrl;
      }

      const overlayConfig = {
        canvas: { format: scene.format, width: scene.width, height: scene.height },
        overlays: promoSceneToEditorTexts(scene).map((t) => ({
          id: crypto.randomUUID(),
          type: "text",
          text: t.text,
          x: t.x,
          y: t.y,
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
          background_url: evt.image_url ?? null,
          overlay_config: overlayConfig,
          label,
          campaign_id: input.campaign_id ?? null,
          is_published: false,
          agent_source: "claude-mcp",
          proposed_by: uid,
          created_by: uid,
          notes: input.beat_label ? `Beat: ${input.beat_label}` : null,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      return okJson(row, "asset");
    } catch (err) {
      return toolError(err, "compose_event_promo");
    }
  },
});
