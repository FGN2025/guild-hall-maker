import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hmacSign(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { event_type, payload } = await req.json();

    if (!event_type || !payload) {
      return new Response(JSON.stringify({ error: "event_type and payload required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active webhooks for this event type
    const { data: webhooks, error: wErr } = await adminClient
      .from("ecosystem_webhooks")
      .select("*")
      .eq("event_type", event_type)
      .eq("is_active", true);

    if (wErr) throw wErr;

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ dispatched: 0, message: "No active webhooks for this event type" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    // PR P-3: surface delivery_id at envelope top-level so receivers can idempotency-key
    // without parsing the inner payload. Falls back to crypto.randomUUID() for
    // event types that don't carry one yet (passport-link etc.).
    const deliveryId: string =
      (payload as any)?.metadata?.delivery_id
      || (payload as any)?.metadata?.external_attempt_id
      || (payload as any)?.delivery_id
      || crypto.randomUUID();
    const payloadStr = JSON.stringify({
      event_type,
      payload,
      delivery_id: deliveryId,
      timestamp: new Date().toISOString(),
    });

    // Phase E HMAC contract (academy receiver):
    //   header  : X-Play-Signature
    //   alg     : HMAC-SHA256, lowercase hex over the RAW request body
    //   secret  : PLAY_WEBHOOK_SECRET (shared, env)
    // For non-academy targets we keep the legacy per-row secret + X-FGN-Signature header.
    const playWebhookSecret = Deno.env.get("PLAY_WEBHOOK_SECRET") || "";

    for (const webhook of webhooks) {
      try {
        const isAcademy = webhook.target_app === "fgn_academy";
        const signingSecret = isAcademy ? playWebhookSecret : webhook.secret_key;

        if (isAcademy && !playWebhookSecret) {
          throw new Error("PLAY_WEBHOOK_SECRET is not configured");
        }

        const signature = await hmacSign(signingSecret, payloadStr);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-FGN-Event": event_type,
          // PR P-3: dual-emit delivery id headers. Receiver already accepts
          // x-play-delivery-id; will accept x-delivery-id once P-3 lands.
          "X-Delivery-Id": deliveryId,
          "X-Play-Delivery-Id": deliveryId,
        };
        if (isAcademy) {
          headers["X-Play-Signature"] = signature;
        } else {
          headers["X-FGN-Signature"] = signature;
        }

        const res = await fetch(webhook.webhook_url, {
          method: "POST",
          headers,
          body: payloadStr,
        });

        const status = res.ok ? "success" : "failed";
        results.push({ target_app: webhook.target_app, status, http_status: res.status });

        // Log the dispatch
        await adminClient.from("ecosystem_sync_log").insert({
          target_app: webhook.target_app,
          data_type: `webhook:${event_type}`,
          records_synced: 1,
          status,
          error_message: res.ok ? null : `HTTP ${res.status}`,
        });
      } catch (fetchErr: any) {
        results.push({ target_app: webhook.target_app, status: "error", message: fetchErr.message });
        await adminClient.from("ecosystem_sync_log").insert({
          target_app: webhook.target_app,
          data_type: `webhook:${event_type}`,
          records_synced: 0,
          status: "error",
          error_message: fetchErr.message,
        });
      }
    }

    return new Response(JSON.stringify({ dispatched: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook dispatch error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
