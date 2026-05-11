// Dormant edge function: generates a one-time Academy Skill Passport magic link.
// Activated only when tenant_integrations.additional_config.passport_link_mode = 'magic_link'
// and additional_config.passport_magic_link_endpoint is set to Academy's endpoint.
// HMAC-SHA256 signing scheme matches §6 (X-Play-Signature) — same secret PLAY_WEBHOOK_SECRET.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const hmacHex = async (secret: string, body: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PLAY_WEBHOOK_SECRET = Deno.env.get("PLAY_WEBHOOK_SECRET");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Missing Authorization" });
    }

    // Verify caller identity
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json(401, { error: "Not authenticated" });

    // Admin client to read integration config
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: integration } = await admin
      .from("tenant_integrations")
      .select("additional_config")
      .eq("provider_type", "fgn_academy")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const cfg = (integration?.additional_config ?? {}) as Record<string, unknown>;
    const endpoint =
      typeof cfg.passport_magic_link_endpoint === "string"
        ? cfg.passport_magic_link_endpoint
        : null;

    if (!endpoint) {
      return json(503, {
        error:
          "Academy magic-link endpoint not configured (passport_magic_link_endpoint). Pending §9 confirmation.",
      });
    }
    if (!PLAY_WEBHOOK_SECRET) {
      return json(500, { error: "PLAY_WEBHOOK_SECRET not set" });
    }

    const reqBody = await req.json().catch(() => ({}));
    const payload = {
      email: reqBody.email ?? user.email ?? null,
      external_user_id: reqBody.external_user_id ?? null,
      timestamp: new Date().toISOString(),
    };
    const canonical = JSON.stringify(payload);
    const signature = await hmacHex(PLAY_WEBHOOK_SECRET, canonical);

    const academyRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Play-Signature": signature,
        "X-FGN-Event": "passport_magic_link",
      },
      body: canonical,
    });

    if (!academyRes.ok) {
      const text = await academyRes.text().catch(() => "");
      return json(academyRes.status, {
        error: `Academy responded ${academyRes.status}`,
        detail: text.slice(0, 500),
      });
    }

    const data = await academyRes.json().catch(() => ({}));
    if (!data?.url || typeof data.url !== "string") {
      return json(502, { error: "Academy did not return a url" });
    }
    return json(200, { url: data.url });
  } catch (err) {
    return json(500, {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});
