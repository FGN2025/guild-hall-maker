import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Standing regression check for the pending_review approval ceiling.
 *
 * Delegates to public.selftest_review_ceiling(), which runs the 16-case
 * matrix (plus adjacent access checks) against the real database and
 * rolls every write back. Returns 200 only when every case passes;
 * anything else is a 500 with the failing cases named, so a caller that
 * only looks at the status code still fails loudly.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const presented = auth.startsWith("Bearer ") ? auth.slice(7) : apikey;
  // Accept the project's own keys (anon/publishable or service role). The
  // check exists to keep the endpoint off the open internet, not to protect
  // secrets: the response contains only case names and pass/fail booleans.
  let authorized = presented === serviceKey;
  if (!authorized && presented.startsWith("eyJ")) {
    try {
      const p = presented.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = p.length % 4 === 0 ? "" : "=".repeat(4 - (p.length % 4));
      const role = JSON.parse(atob(p + pad)).role;
      authorized = role === "anon" || role === "service_role";
    } catch (_) { /* not a JWT */ }
  }
  if (!authorized && presented.startsWith("sb_publishable_")) authorized = true;
  if (!authorized) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("selftest_review_ceiling");
    if (error) throw error;

    const ok = data?.ok === true;
    if (!ok) {
      const failed = (data?.cases ?? []).filter((c: any) => !c.passed);
      console.error("[review-ceiling-selftest] FAILED", JSON.stringify(failed));
    }
    return new Response(JSON.stringify(data), {
      status: ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
