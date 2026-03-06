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
    const payloadStr = JSON.stringify({ event_type, payload, timestamp: new Date().toISOString() });

    for (const webhook of webhooks) {
      try {
        const signature = await hmacSign(webhook.secret_key, payloadStr);

        const res = await fetch(webhook.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-FGN-Signature": signature,
            "X-FGN-Event": event_type,
          },
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
