// Dedicated rasterizer worker.
//
// WHY THIS EXISTS: Supabase Edge Functions enforce a per-request CPU-time
// budget (~2s), and a single 1080x1350 promo render costs roughly 1.0-1.3s of
// CPU once the background art has to be decoded. `compose_event_promo` needs
// TWO rasters — the flattened promo and the text-free editor plate — so doing
// both inside one request reliably blows the budget on the larger formats and
// the larger cover art. The failure surfaced as an opaque WORKER_RESOURCE_LIMIT
// with no classification.
//
// Splitting the rasters across two requests gives each render its own CPU
// budget. This is the composer's real render path, not a one-off script: the
// MCP tool calls this function twice and does only DB/storage work itself.
//
// Access: internal only. Callers must present the service-role key, which is
// never exposed to a browser or to the agent.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { BUILD_ID } from "../_shared/build-id.ts";
import { composePromoLayout } from "../_shared/promo/composePromoLayout.ts";
import type { PromoScene, ComposePromoArgs } from "../_shared/promo/composePromoLayout.ts";
import {
  renderPromoSceneToPng,
  preparePromoBackground,
  PromoRenderError,
} from "../_shared/promo/renderPromo.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") {
    return Response.json({ build_id: BUILD_ID }, { headers: corsHeaders });
  }

  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const presented = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || presented !== expected) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: corsHeaders });
  }

  let body: {
    scene?: PromoScene;
    /** Compose the scene here, with the DEPLOYED composer, instead of trusting
     *  a client-built scene. Used to prove live layout behaviour by probe. */
    compose?: ComposePromoArgs;
    background_url?: string | null;
    includeText?: boolean;
    includeScrim?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: corsHeaders });
  }
  let scene = body.scene;
  let composedLog: string | null = null;
  if (!scene && body.compose) {
    const composed = composePromoLayout(body.compose);
    if (body.background_url) composed.backgroundUrl = body.background_url;
    composedLog = composed.titleNormalization.log;
    scene = composed;
  }
  if (!scene || typeof scene.width !== "number" || typeof scene.height !== "number") {
    return Response.json({ error: "scene_required" }, { status: 400, headers: corsHeaders });
  }


  const started = Date.now();
  try {
    const bg = await preparePromoBackground(scene.backgroundUrl, scene);
    const png = await renderPromoSceneToPng(scene, {
      includeText: body.includeText !== false,
      includeScrim: body.includeScrim !== false,
      background: bg,
    });
    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "X-Promo-Build": BUILD_ID,
        "X-Promo-Ms": String(Date.now() - started),
        "X-Promo-Background": bg ? bg.log : "none",
        ...(composedLog ? { "X-Promo-Title": composedLog } : {}),
      },
    });
  } catch (err) {
    if (err instanceof PromoRenderError) {
      console.error(`[promo-render] ${err.code}: ${err.message}`, err.detail);
      return Response.json(
        { error: "render_failed", code: err.code, message: err.message, detail: err.detail },
        { status: 422, headers: corsHeaders },
      );
    }
    console.error("[promo-render] unexpected", err);
    return Response.json(
      { error: "render_failed", code: "unexpected", message: (err as Error).message },
      { status: 500, headers: corsHeaders },
    );
  }
});
