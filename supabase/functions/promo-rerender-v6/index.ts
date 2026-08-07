// ONE-OFF. August 2026 re-render on build 2026-08-06T22:20Z-typescale-prizepool.
// DELETE AFTER USE (probe must return 404).
import { createClient } from "npm:@supabase/supabase-js@2";
import { composePromoLayout, promoSceneToEditorTexts } from "../_shared/promo/composePromoLayout.ts";
import { renderPromoSceneToPng } from "../_shared/promo/renderPromo.ts";
import { resolveEventArt } from "../_shared/promo/resolveEventArt.ts";
import { BUILD_ID } from "../_shared/build-id.ts";

const BUCKET = "tenant-marketing";
const svc = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function sha256(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "GET") return Response.json({ build_id: BUILD_ID });
  const body = await req.json().catch(() => ({}));
  const ids: string[] = body.ids ?? [];
  const s = svc();
  const out: unknown[] = [];

  for (const assetId of ids) {
    try {
      const { data: asset, error } = await s
        .from("tenant_marketing_assets")
        .select("id, tenant_id, file_path, file_name, notes, label, campaign_id")
        .eq("id", assetId).single();
      if (error) throw error;

      const m = /promo-([0-9a-f-]{36})-(announce|day-of|countdown|recap)-/.exec(asset.file_path);
      if (!m) throw new Error(`cannot parse event/beat from ${asset.file_path}`);
      const eventId = m[1];
      const beatSlug = m[2];
      const beatLabel = beatSlug === "day-of" ? "Day-Of"
        : beatSlug.charAt(0).toUpperCase() + beatSlug.slice(1);

      // old bytes
      const oldDl = await s.storage.from(BUCKET).download(asset.file_path);
      const oldSha = oldDl.data ? await sha256(new Uint8Array(await oldDl.data.arrayBuffer())) : null;

      // event
      let evt: any = null;
      let kind = "tournament";
      const t = await s.from("tournaments")
        .select("id, name, game, start_date, prize_pool, prize_type, image_url")
        .eq("id", eventId).maybeSingle();
      if (t.data) evt = t.data;
      else {
        const e = await s.from("tenant_events")
          .select("id, name, game, start_date, prize_pool, prize_type, image_url")
          .eq("id", eventId).maybeSingle();
        evt = e.data; kind = "tenant_event";
      }
      if (!evt) throw new Error(`event ${eventId} not found`);

      const { data: tenant } = await s.from("tenants")
        .select("name, primary_color, accent_color").eq("id", asset.tenant_id).maybeSingle();

      const scene = composePromoLayout({
        event: {
          name: evt.name, game: evt.game ?? null, start_date: evt.start_date ?? null,
          prize_pool: evt.prize_pool ?? null, prize_type: evt.prize_type ?? null,
        },
        tenantName: (tenant as any)?.name ?? null,
        tenantPrimaryColor: (tenant as any)?.primary_color ?? null,
        tenantAccentColor: (tenant as any)?.accent_color ?? null,
        format: "portrait",
        beatLabel,
      });
      const art = await resolveEventArt(
        { image_url: evt.image_url ?? null, game: evt.game ?? null, name: evt.name }, s,
      );
      scene.backgroundUrl = art.url;

      // `stage` splits the two renders across separate invocations for events
      // whose cover art is large enough to OOM a single worker (SSBU, 1.5 MB).
      const stage: "both" | "image" | "plate" = body.stage ?? "both";
      const uuid = body.base ?? crypto.randomUUID();
      const base = `${asset.tenant_id}/agent/2026/08/v6-typescale-promo-${eventId}-${beatSlug}-${uuid}`;
      const path = `${base}.png`;
      const platePath = `${base}-plate.png`;
      const ttl = 60 * 60 * 24 * 365;

      let newSha: string | null = null;
      if (stage === "both" || stage === "image") {
        const png = await renderPromoSceneToPng(scene);
        newSha = await sha256(png);
        const { error: ue } = await s.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: false });
        if (ue) throw ue;
        if (stage === "image") {
          out.push({ asset_id: assetId, stage, base: uuid, new_path: path, new_sha256: newSha });
          continue;
        }
      }
      {
        const plate = await renderPromoSceneToPng(scene, { includeText: false });
        const { error: ue } = await s.storage.from(BUCKET).upload(platePath, plate, { contentType: "image/png", upsert: false });
        if (ue) throw ue;
      }
      if (newSha === null) {
        const dl = await s.storage.from(BUCKET).download(path);
        newSha = await sha256(new Uint8Array(await dl.data!.arrayBuffer()));
      }
      const su = await s.storage.from(BUCKET).createSignedUrl(path, ttl);
      const sp = await s.storage.from(BUCKET).createSignedUrl(platePath, ttl);


      const overlayConfig = {
        canvas: { format: scene.format, width: scene.width, height: scene.height },
        overlays: promoSceneToEditorTexts(scene).map((t2) => ({
          id: crypto.randomUUID(), type: "text", text: t2.text,
          x: t2.x, y: t2.y, xPct: t2.xPct, yPct: t2.yPct,
          fontSize: t2.fontSize, color: t2.color, fontFamily: t2.fontFamily, fontWeight: t2.fontWeight,
        })),
      };
      const notes = [
        `Beat: ${beatLabel}`,
        `Art: ${art.provenance}${art.matchedGameName ? ` (${art.matchedGameName}, ${art.matchMethod})` : ""}`,
        `Title: ${scene.titleNormalization.log}`,
        `build=${BUILD_ID}`,
      ].join(" · ");

      // 1) asset first, 2) then post, so enforce_scheduled_post_asset_link sees a match.
      const { error: ae } = await s.from("tenant_marketing_assets").update({
        file_path: path, url: su.data!.signedUrl, background_url: sp.data!.signedUrl,
        overlay_config: overlayConfig, notes,
      }).eq("id", assetId);
      if (ae) throw ae;

      const { data: posts, error: pe } = await s.from("scheduled_posts")
        .update({ image_path: path, image_url: su.data!.signedUrl })
        .eq("asset_id", assetId).select("id");
      if (pe) throw pe;

      // old objects
      const oldPlate = asset.file_path.replace(/\.png$/, "-plate.png");
      await s.storage.from(BUCKET).remove([asset.file_path, oldPlate]);

      out.push({
        asset_id: assetId, event_id: eventId, kind, beat: beatLabel, game: evt.game,
        old_path: asset.file_path, new_path: path,
        old_sha256: oldSha, new_sha256: newSha, identical: oldSha === newSha,
        art: art.provenance, art_game: art.matchedGameName ?? null, art_method: art.matchMethod ?? null,
        title_log: scene.titleNormalization.log,
        posts_updated: (posts ?? []).map((p: any) => p.id), trigger_error: null,
      });
    } catch (err) {
      out.push({ asset_id: assetId, error: String((err as any)?.message ?? err) });
    }
  }
  return Response.json({ build_id: BUILD_ID, results: out });
});
