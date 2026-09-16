// Admin-only self-test for the FGN ecosystem connector endpoints.
// Runs live probes against ecosystem-data-api and merit-connector-api using the
// stored ECOSYSTEM_API_KEY. Never returns the key itself.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Check {
  id: string;
  label: string;
  expected: string;
  status: number | null;
  passed: boolean;
  detail: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ecosystemKey = Deno.env.get("ECOSYSTEM_API_KEY") ?? "";

  try {
    // ---- admin gate ----
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Admin only" }, 403);

    if (!ecosystemKey) {
      return json({
        checked_at: new Date().toISOString(),
        key_configured: false,
        status: "error",
        checks: [],
        message: "ECOSYSTEM_API_KEY is not configured on the server.",
      });
    }

    const dataApi = `${supabaseUrl}/functions/v1/ecosystem-data-api`;
    const meritApi = `${supabaseUrl}/functions/v1/merit-connector-api`;

    const probe = async (
      id: string,
      label: string,
      expectedStatus: number,
      url: string,
      headers: Record<string, string>,
      body: unknown,
    ): Promise<Check> => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        let detail = text.slice(0, 200);
        try {
          const parsed = JSON.parse(text);
          detail = parsed.error ?? parsed.status ?? detail;
        } catch { /* keep raw */ }
        return {
          id,
          label,
          expected: `HTTP ${expectedStatus}`,
          status: res.status,
          passed: res.status === expectedStatus,
          detail: String(detail),
        };
      } catch (e) {
        return {
          id,
          label,
          expected: `HTTP ${expectedStatus}`,
          status: null,
          passed: false,
          detail: e instanceof Error ? e.message : "request failed",
        };
      }
    };

    const checks: Check[] = [];
    checks.push(await probe("no_key", "Data API rejects requests with no key", 401, dataApi, {}, { action: "health" }));
    checks.push(await probe("bad_key", "Data API rejects an invalid key", 401, dataApi, { "x-ecosystem-key": "invalid-test-key" }, { action: "health" }));
    checks.push(await probe("health", "Data API health check with the shared key", 200, dataApi, { "x-ecosystem-key": ecosystemKey }, { action: "health" }));
    checks.push(await probe("data_read", "Data API returns catalogue data", 200, dataApi, { "x-ecosystem-key": ecosystemKey }, { action: "tournaments", limit: 1 }));
    checks.push(await probe("merit_health", "Merit connector health check", 200, meritApi, { "x-ecosystem-key": ecosystemKey, "x-ecosystem-app": "merit" }, { action: "health" }));
    checks.push(await probe("merit_app", "Merit connector rejects an unknown app", 401, meritApi, { "x-ecosystem-key": ecosystemKey, "x-ecosystem-app": "nope" }, { action: "health" }));

    const failed = checks.filter((c) => !c.passed).length;
    return json({
      checked_at: new Date().toISOString(),
      key_configured: true,
      status: failed === 0 ? "healthy" : "error",
      passed: checks.length - failed,
      total: checks.length,
      checks,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unexpected error" }, 500);
  }
});
