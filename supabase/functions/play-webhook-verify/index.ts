// Internal diagnostic: fires a single signed test webhook at a registered
// ecosystem receiver using PLAY_WEBHOOK_SECRET, and reports whether the
// receiver accepted the signature. Never returns or logs the secret value.
// Requires the service-role key in the Authorization header.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

const hmacHex = async (secret: string, body: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${serviceKey}`) {
    return json(401, { error: "service role required" });
  }

  const secret = Deno.env.get("PLAY_WEBHOOK_SECRET") ?? "";
  if (!secret) return json(500, { error: "PLAY_WEBHOOK_SECRET not configured" });

  const secretBytes = new TextEncoder().encode(secret);
  const fingerprint = toHex(await crypto.subtle.digest("SHA-256", secretBytes)).slice(0, 12);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const targetApp: string = body.target_app ?? "fgn_academy";

  const { data: hook, error } = await admin
    .from("ecosystem_webhooks")
    .select("id, target_app, event_type, webhook_url, is_active")
    .eq("target_app", targetApp)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !hook) {
    return json(404, { error: `no active webhook registered for ${targetApp}` });
  }

  const deliveryId = crypto.randomUUID();
  const payloadStr = JSON.stringify({
    event_type: "connectivity_test",
    payload: { test: true, source: "play-webhook-verify", note: "signature parity check — no data to persist" },
    delivery_id: deliveryId,
    timestamp: new Date().toISOString(),
  });

  const signature = await hmacHex(secret, payloadStr);

  let httpStatus: number | null = null;
  let responseBody = "";
  let transportError: string | null = null;

  try {
    const res = await fetch(hook.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FGN-Event": "connectivity_test",
        "X-Play-Signature": signature,
        "X-Delivery-Id": deliveryId,
        "X-Play-Delivery-Id": deliveryId,
      },
      body: payloadStr,
    });
    httpStatus = res.status;
    responseBody = (await res.text().catch(() => "")).slice(0, 500);
  } catch (e) {
    transportError = e instanceof Error ? e.message : String(e);
  }

  const signatureRejected = httpStatus === 401 || httpStatus === 403;

  return json(200, {
    target_app: hook.target_app,
    webhook_url: hook.webhook_url,
    delivery_id: deliveryId,
    play_secret_sha256_12: fingerprint,
    secret_len: secretBytes.length,
    signature_prefix: signature.slice(0, 8),
    http_status: httpStatus,
    response_body: responseBody,
    transport_error: transportError,
    signature_accepted: httpStatus !== null && !signatureRejected,
  });
});
