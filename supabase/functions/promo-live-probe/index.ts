// TEMPORARY probe. Runs INSIDE the edge runtime so it can present the real
// service-role key to `promo-render`, composes one scratch sample with the
// deployed composer and returns its signed URL + the title-normalization log.
// It writes ONLY to a scratch storage path and touches no database row.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { BUILD_ID } from "../_shared/build-id.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

  const res = await fetch(`${url}/functions/v1/promo-render`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return Response.json(
      { error: "render_failed", status: res.status, detail: await res.text() },
      { status: 502, headers: corsHeaders },
    );
  }
  const titleLog = res.headers.get("x-promo-title");
  const renderBuild = res.headers.get("x-promo-build");
  const bytes = new Uint8Array(await res.arrayBuffer());

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const path = `${body.tenant_id}/scratch/live-probe-${crypto.randomUUID()}.png`;
  const up = await sb.storage.from("tenant-marketing").upload(path, bytes, {
    contentType: "image/png",
    upsert: false,
  });
  if (up.error) return Response.json({ error: up.error.message }, { status: 500, headers: corsHeaders });
  const signed = await sb.storage.from("tenant-marketing").createSignedUrl(path, 60 * 60 * 24 * 7);

  return Response.json(
    { probe_build: BUILD_ID, render_build: renderBuild, title_log: titleLog, path, url: signed.data?.signedUrl },
    { headers: corsHeaders },
  );
});
