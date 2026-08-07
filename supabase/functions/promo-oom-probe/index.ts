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

    // === exactly what compose_event_promo now runs: two worker renders ===
    const call = async (includeText: boolean) => {
      const t = Date.now();
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/promo-render`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ scene, includeText }),
      });
      if (!res.ok) throw new PromoRenderError("worker_failed", JSON.stringify(await res.json().catch(() => ({}))));
      const bytes = new Uint8Array(await res.arrayBuffer());
      return { bytes, ms: Date.now() - t, workerMs: res.headers.get("x-promo-ms"), bg: res.headers.get("x-promo-background") };
    };
    const full = await call(true);
    const plateR = await call(false);
    const png = full.bytes, plate = plateR.bytes;

    return Response.json({
      build_id: BUILD_ID,
      ok: true,
      single_invocation: true,
      event: { id: evt.id, name: evt.name, game: evt.game },
      art: { provenance: art.provenance, url: art.url },
      background: full.bg,
      render: {
        png_bytes: png.length, png_sha256: await sha256(png),
        plate_bytes: plate.length, plate_sha256: await sha256(plate),
      },
      timings_ms: { render_full: full.ms, worker_full_cpu: full.workerMs, render_plate: plateR.ms, worker_plate_cpu: plateR.workerMs, total: Date.now() - t0 },


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
