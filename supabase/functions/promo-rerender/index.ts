// TEMPORARY maintenance function — re-renders already-composed agent promo
// assets with the current shared layout (background plate, title wrapping,
// prize units). Delete after the August seed assets are corrected.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { composePromoLayout, promoSceneToEditorTexts } from "../_shared/promo/composePromoLayout.ts";
import { renderPromoSceneToPng } from "../_shared/promo/renderPromo.ts";

const BUCKET = "tenant-marketing";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const URL = Deno.env.get("SUPABASE_URL")!;

const svc = () => createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function parseEventId(filePath: string): string | null {
  const m = filePath.match(/promo-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i);
  return m ? m[1] : null;
}

async function loadEvent(db: any, eventId: string) {
  const cols = "id, name, game, start_date, prize_pool, prize_type, image_url";
  const t = await db.from("tournaments").select(cols).eq("id", eventId).maybeSingle();
  if (t.data) return t.data;
  const e = await db.from("tenant_events").select(cols).eq("id", eventId).maybeSingle();
  return e.data ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.headers.get("x-admin-key") !== SERVICE_KEY) return json({ error: "unauthorized" }, 401);

  try {
    const body = await req.json();
    const db = svc();

    // --- preview mode: render one event, return base64 (evidence screenshots)
    if (body.mode === "preview") {
      const evt = await loadEvent(db, body.event_id);
      if (!evt) return json({ error: "event not found" }, 404);
      const { data: tenant } = await db.from("tenants").select("primary_color, accent_color").eq("id", body.tenant_id).maybeSingle();
      const scene = composePromoLayout({
        event: evt,
        tenantPrimaryColor: tenant?.primary_color ?? null,
        tenantAccentColor: tenant?.accent_color ?? null,
        format: body.format ?? "portrait",
        beatLabel: body.beat_label ?? null,
      });
      scene.backgroundUrl = evt.image_url ?? null;
      const png = await renderPromoSceneToPng(scene);
      return json({ scene, png_base64: btoa(String.fromCharCode(...png)) });
    }

    // --- rerender mode
    const { data: assets, error } = await db
      .from("tenant_marketing_assets")
      .select("id, tenant_id, file_path, notes, overlay_config, campaign_id")
      .eq("tenant_id", body.tenant_id)
      .not("agent_source", "is", null)
      .gte("created_at", body.since ?? "2026-07-01")
      .limit(body.limit ?? 100);
    if (error) throw error;

    const { data: tenant } = await db.from("tenants").select("primary_color, accent_color").eq("id", body.tenant_id).maybeSingle();

    const results: any[] = [];
    for (const a of assets ?? []) {
      try {
        const eventId = parseEventId(a.file_path ?? "");
        if (!eventId) { results.push({ id: a.id, skipped: "no event id in path" }); continue; }
        const evt = await loadEvent(db, eventId);
        if (!evt) { results.push({ id: a.id, skipped: "event missing" }); continue; }

        const beatLabel = (a.notes ?? "").startsWith("Beat: ") ? a.notes.slice(6) : null;
        const format = a.overlay_config?.canvas?.format ?? "portrait";
        const scene = composePromoLayout({
          event: evt,
          tenantPrimaryColor: tenant?.primary_color ?? null,
          tenantAccentColor: tenant?.accent_color ?? null,
          format,
          beatLabel,
        });
        scene.backgroundUrl = evt.image_url ?? null;

        const png = await renderPromoSceneToPng(scene);
        const platePng = await renderPromoSceneToPng(scene, { includeText: false });

        const base = (a.file_path as string).replace(/\.png$/, "");
        const path = `${base}-v2.png`;
        const platePath = `${base}-v2-plate.png`;
        for (const [p, bytes] of [[path, png], [platePath, platePng]] as const) {
          const { error: upErr } = await db.storage.from(BUCKET).upload(p, bytes, { contentType: "image/png", upsert: true });
          if (upErr) throw upErr;
        }
        const ttl = 60 * 60 * 24 * 365;
        const [u1, u2] = await Promise.all([
          db.storage.from(BUCKET).createSignedUrl(path, ttl),
          db.storage.from(BUCKET).createSignedUrl(platePath, ttl),
        ]);
        const overlayConfig = {
          canvas: { format: scene.format, width: scene.width, height: scene.height },
          overlays: promoSceneToEditorTexts(scene).map((t) => ({
            id: crypto.randomUUID(), type: "text", text: t.text,
            x: t.x, y: t.y, xPct: t.xPct, yPct: t.yPct,
            fontSize: t.fontSize, color: t.color, fontFamily: t.fontFamily, fontWeight: t.fontWeight,
          })),
        };
        const { error: updErr } = await db
          .from("tenant_marketing_assets")
          .update({
            file_path: path,
            url: u1.data?.signedUrl,
            background_url: u2.data?.signedUrl,
            overlay_config: overlayConfig,
          })
          .eq("id", a.id)
          .select("id")
          .single();
        if (updErr) throw updErr;
        results.push({ id: a.id, ok: true, path, has_bg_image: !!scene.backgroundUrl, title_lines: scene.texts.filter((t) => t.color === "#ffffff").length });
      } catch (e) {
        results.push({ id: a.id, error: String((e as any)?.message ?? e) });
      }
    }
    return json({ count: results.length, results });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
