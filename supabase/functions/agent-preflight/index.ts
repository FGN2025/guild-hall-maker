/*
 * agent-preflight — read-only "what will this run do" endpoint.
 * ----------------------------------------------------------------------------
 * Computes the effective scope of a monthly_calendar_seed run from the SAME
 * module the runner uses (../_shared/seed-scope.ts), so the summary the
 * launcher confirms cannot drift from what the run is told. Writes nothing.
 * ----------------------------------------------------------------------------
 */
import { createClient } from "@supabase/supabase-js";
import { buildPreflight, renderConstraintBlock, scopeSummary } from "../_shared/seed-scope.ts";
import { BUILD_ID } from "../_shared/build-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const service = () =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") return json({ build_id: BUILD_ID });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const jwt = authHeader.slice(7);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: claimsErr } = await userClient.auth.getUser(jwt);
  if (claimsErr || !userData?.user?.id) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const { tenant_id, target_month, range_start, range_end, include_kickoff, seed_density, instruction } = payload ?? {};
  if (!tenant_id) return json({ error: "tenant_id required" }, 400);
  if (!target_month || !/^\d{4}-\d{2}$/.test(String(target_month))) {
    return json({ error: "target_month (YYYY-MM) required" }, 400);
  }
  if (range_start && !DATE_RE.test(String(range_start))) return json({ error: "range_start must be YYYY-MM-DD" }, 400);
  if (range_end && !DATE_RE.test(String(range_end))) return json({ error: "range_end must be YYYY-MM-DD" }, 400);
  if (range_start && range_end && String(range_start) > String(range_end)) {
    return json({ error: "range_start must not be after range_end" }, 400);
  }
  if (seed_density && !["light", "standard", "full"].includes(seed_density)) {
    return json({ error: "seed_density must be light, standard or full" }, 400);
  }
  if (instruction && String(instruction).length > 500) return json({ error: "instruction max 500 chars" }, 400);

  const svc = service();

  // Authorize: platform admin OR tenant admin/manager on the target tenant.
  const { data: platformAdmin } = await svc.rpc("has_role", { _user_id: userId, _role: "admin" });
  let allowed = !!platformAdmin;
  if (!allowed) {
    const { data: ta } = await svc.from("tenant_admins")
      .select("role").eq("tenant_id", tenant_id).eq("user_id", userId).maybeSingle();
    if (ta && (ta.role === "admin" || ta.role === "manager")) allowed = true;
  }
  if (!allowed) return json({ error: "forbidden: admin or manager role required on target tenant" }, 403);

  try {
    const pf = await buildPreflight(svc, {
      tenant_id,
      target_month: String(target_month),
      range_start: range_start ?? null,
      range_end: range_end ?? null,
      include_kickoff: typeof include_kickoff === "boolean" ? include_kickoff : true,
      density: seed_density ?? null,
      instruction: instruction ?? null,
    });
    return json({
      build_id: BUILD_ID,
      preflight: pf,
      summary: scopeSummary(pf),
      constraint_block: renderConstraintBlock(pf),
    });
  } catch (e) {
    console.error("[agent-preflight] failed", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
