import { createClient } from "jsr:@supabase/supabase-js@2";

// Internal maintenance endpoint: keeps the vault-stored dispatcher signing
// secret ('ecosystem_dispatch_secret') in sync with the ECOSYSTEM_WEBHOOK_SIGNING_SECRET
// environment value. Requires a valid JWT (service role); never returns secret values.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const secret = Deno.env.get("ECOSYSTEM_WEBHOOK_SIGNING_SECRET") ?? "";
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "ECOSYSTEM_WEBHOOK_SIGNING_SECRET not configured" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (req.method === "GET") {
    const { data, error } = await admin.rpc("sync_dispatch_signing_secret", {
      p_secret: secret,
      p_apply: false,
    });
    return new Response(
      JSON.stringify({ in_sync: !error && data === true }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (req.method === "POST") {
    const { data, error } = await admin.rpc("sync_dispatch_signing_secret", {
      p_secret: secret,
      p_apply: true,
    });
    return new Response(
      JSON.stringify({ synced: !error && data === true }),
      { status: error ? 500 : 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
