// Re-renders an existing tenant_marketing_assets row under the CURRENT composer
// build, so fixes shipped after the asset was made (notably the 2026-08-11
// scrim split) reach already-composed art. One asset per invocation: each
// raster gets its own CPU budget in the promo-render worker.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { composePromoLayout, promoSceneToEditorTexts } from "../_shared/promo/composePromoLayout.ts";
import type { PromoScene } from "../_shared/promo/composePromoLayout.ts";
import { resolveEventArt } from "../_shared/promo/resolveEventArt.ts";
import { BUILD_ID } from "../_shared/build-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "tenant-marketing";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function renderViaWorker(scene: PromoScene, includeText: boolean, includeScrim = true): Promise<Uint8Array> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/promo-render`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ scene, includeText, includeScrim }),
  });
  if (!res.ok) {
    throw new Error(`promo-render ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** promo-<eventId>-<beat>-<uuid>.png  (beat may contain hyphens: "day-of") */
function parsePath(filePath: string): { eventId: string; beat: string } | null {
  const base = filePath.split("/").pop() ?? "";
  const m = base.match(
    /^promo-([0-9a-f-]{36})-(.+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-plate)?\.png$/i,
  );
  if (!m) return null;
  return { eventId: m[1], beat: m[2] };
}

function beatLabel(beat: string): string {
  return beat
    .split("-")
    .map((p) => (p.toLowerCase() === "of" ? "Of" : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("-");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") return Response.json({ build_id: BUILD_ID }, { headers: corsHeaders });

  const presented = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const opSecret = Deno.env.get("PROMO_RERENDER_SECRET") ?? "";
  const allowed = (!!SERVICE_KEY && presented === SERVICE_KEY) || (!!opSecret && presented === opSecret);
  if (!allowed) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const body = await req.json();
    const assetId: string = body.asset_id;
    const dryRun: boolean = !!body.dry_run;
    if (!assetId) return Response.json({ error: "asset_id required" }, { status: 400, headers: corsHeaders });

    const { data: asset, error: aErr } = await supabase
      .from("tenant_marketing_assets")
      .select("id, tenant_id, file_path, url, background_url, overlay_config, file_name, label")
      .eq("id", assetId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!asset) return Response.json({ error: "asset not found" }, { status: 404, headers: corsHeaders });

    const parsed = parsePath(asset.file_path ?? "");
    if (!parsed) {
      return Response.json({ error: "unparseable_path", file_path: asset.file_path }, { status: 422, headers: corsHeaders });
    }

    // Event: tournament first, then tenant event.
    let evt: any = null;
    const { data: t } = await supabase
      .from("tournaments")
      .select("id, name, game, start_date, prize_pool, prize_type, image_url")
      .eq("id", parsed.eventId)
      .maybeSingle();
    evt = t;
    if (!evt) {
      const { data: e } = await supabase
        .from("tenant_events")
        .select("id, name, game, start_date, prize_pool, prize_type, image_url")
        .eq("id", parsed.eventId)
        .maybeSingle();
      evt = e;
    }
    if (!evt) return Response.json({ error: "source_event_missing", event_id: parsed.eventId }, { status: 404, headers: corsHeaders });

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, primary_color, accent_color")
      .eq("id", asset.tenant_id)
      .maybeSingle();

    const format = (asset.overlay_config as any)?.canvas?.format ?? body.format ?? "portrait";
    const promoArgs = {
      event: {
        name: evt.name,
        game: evt.game ?? null,
        start_date: evt.start_date ?? null,
        prize_pool: evt.prize_pool ?? null,
        prize_type: evt.prize_type ?? null,
      },
      tenantName: tenant?.name ?? null,
      tenantPrimaryColor: tenant?.primary_color ?? null,
      tenantAccentColor: tenant?.accent_color ?? null,
      format,
      beatLabel: beatLabel(parsed.beat),
    };
    const scene = composePromoLayout(promoArgs as any);
    const art = await resolveEventArt(
      { image_url: evt.image_url ?? null, game: evt.game ?? null, name: evt.name },
      supabase as any,
    );
    scene.backgroundUrl = art.url;

    if (dryRun) {
      return Response.json(
        { asset_id: assetId, event: evt.name, beat: promoArgs.beatLabel, format, art: art.log, build_id: BUILD_ID },
        { headers: corsHeaders },
      );
    }

    // Spot-check sample: renders and uploads under a /samples/ prefix and
    // returns a signed URL. NO database row is created or updated, so nothing
    // enters the reviewed set or any tenant's approval queue.
    if (body.sample) {
      const samplePng = await renderViaWorker(scene, true);
      const samplePath = `${asset.tenant_id}/samples/${format}-${evt.id}-${crypto.randomUUID()}.png`;
      const up = await supabase.storage.from(BUCKET).upload(samplePath, samplePng, { contentType: "image/png" });
      if (up.error) throw up.error;
      const { data: sUrl, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(samplePath, 60 * 60 * 24 * 7);
      if (sErr || !sUrl) throw sErr;
      return Response.json(
        { sample: true, db_writes: 0, event: evt.name, beat: promoArgs.beatLabel, format, path: samplePath, url: sUrl.signedUrl, art: art.log, build_id: BUILD_ID },
        { headers: corsHeaders },
      );
    }

    const png = await renderViaWorker(scene, true);
    const platePng = await renderViaWorker(scene, false, false);

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const uuid = crypto.randomUUID();
    const path = `${asset.tenant_id}/agent/${yyyy}/${mm}/promo-${evt.id}-${parsed.beat}-${uuid}.png`;
    const platePath = path.replace(/\.png$/, "-plate.png");

    for (const [p, bytes] of [[path, png], [platePath, platePng]] as const) {
      const { error } = await supabase.storage.from(BUCKET).upload(p, bytes, { contentType: "image/png", upsert: false });
      if (error) throw error;
    }

    const ttl = 60 * 60 * 24 * 365;
    async function sign(p: string) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(p, ttl);
      if (error || !data?.signedUrl) throw error ?? new Error(`could not sign ${p}`);
      return data.signedUrl;
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

    const { error: uErr } = await supabase
      .from("tenant_marketing_assets")
      .update({
        file_path: path,
        url: storedUrl,
        background_url: plateUrl,
        overlay_config: overlayConfig,
        notes: `Re-rendered scrim-safe under ${BUILD_ID} · Art: ${art.provenance}`,
      })
      .eq("id", assetId);
    if (uErr) throw uErr;

    // Keep every post pointing at this asset in lockstep. Status untouched.
    const { data: posts, error: pErr } = await supabase
      .from("scheduled_posts")
      .update({ image_url: storedUrl, image_path: path })
      .eq("asset_id", assetId)
      .select("id, status");
    if (pErr) throw pErr;

    return Response.json(
      {
        asset_id: assetId,
        event: evt.name,
        beat: promoArgs.beatLabel,
        file_path: path,
        plate_path: platePath,
        scrim_persisted: true,
        art: art.log,
        posts_updated: posts ?? [],
        build_id: BUILD_ID,
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("[promo-rerender]", err);
    return Response.json({ error: String((err as Error).message ?? err) }, { status: 500, headers: corsHeaders });
  }
});
