// ONE-OFF. Proves the background budget closes the OOM defect by running the
// EXACT memory path compose_event_promo runs — same _shared/promo modules, one
// invocation, both renders — against the largest cover art in the games table.
// Delete after use and probe for 404.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { BUILD_ID } from "../_shared/build-id.ts";
import { composePromoLayout } from "../_shared/promo/composePromoLayout.ts";
import { resolveEventArt } from "../_shared/promo/resolveEventArt.ts";
import {
  renderPromoSceneToPng,
  preparePromoBackground,
  PromoRenderError,
} from "../_shared/promo/renderPromo.ts";

const svc = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

async function sha256(b: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", b);
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "GET") return Response.json({ build_id: BUILD_ID });
  const body = await req.json().catch(() => ({}));
  const s = svc();
  const t0 = Date.now();
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); origLog(...a); };

  try {
    const { data: evt, error } = await s
      .from("tournaments")
      .select("id, name, game, start_date, prize_pool, prize_type, image_url")
      .eq("id", body.tournament_id)
      .single();
    if (error) throw error;

    const { data: tenant } = await s
      .from("tenants").select("name, primary_color, accent_color").eq("id", body.tenant_id).maybeSingle();

    const scene = composePromoLayout({
      event: {
        name: evt.name, game: evt.game, start_date: evt.start_date,
        prize_pool: evt.prize_pool, prize_type: evt.prize_type,
      },
      tenantName: tenant?.name ?? null,
      tenantPrimaryColor: tenant?.primary_color ?? null,
      tenantAccentColor: tenant?.accent_color ?? null,
      format: body.format ?? "portrait",
      beatLabel: body.beat_label ?? "Announce",
    });

    const art = await resolveEventArt(
      { image_url: evt.image_url ?? null, game: evt.game ?? null, name: evt.name }, s,
    );
    scene.backgroundUrl = art.url;

    // === the exact three lines compose_event_promo now runs ===
    const tPrep = Date.now();
    const bg = await preparePromoBackground(scene.backgroundUrl, scene);
    const prepMs = Date.now() - tPrep;
    const tR1 = Date.now();
    const png = await renderPromoSceneToPng(scene, { background: bg });
    const r1Ms = Date.now() - tR1;
    const tR2 = Date.now();
    const plate = await renderPromoSceneToPng(scene, { includeText: false, background: bg });
    const r2Ms = Date.now() - tR2;

    return Response.json({
      build_id: BUILD_ID,
      ok: true,
      single_invocation: true,
      event: { id: evt.id, name: evt.name, game: evt.game },
      art: { provenance: art.provenance, url: art.url },
      background: bg
        ? { log: bg.log, bytes: bg.bytes, width: bg.width, height: bg.height, downscaled: bg.downscaled, inline_chars: bg.dataUrl.length }
        : null,
      render: {
        png_bytes: png.length, png_sha256: await sha256(png),
        plate_bytes: plate.length, plate_sha256: await sha256(plate),
      },
      timings_ms: { prepare: prepMs, render_full: r1Ms, render_plate: r2Ms, total: Date.now() - t0 },
      logs,
    });
  } catch (err) {
    const classified = err instanceof PromoRenderError;
    return Response.json({
      build_id: BUILD_ID,
      ok: false,
      classified,
      code: classified ? (err as PromoRenderError).code : null,
      detail: classified ? (err as PromoRenderError).detail : null,
      message: (err as Error).message,
      logs,
    }, { status: 200 });
  } finally {
    console.log = origLog;
  }
});
