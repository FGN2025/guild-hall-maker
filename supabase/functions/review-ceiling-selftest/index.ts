import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * STANDING REGRESSION SUITE for the pending_review approval ceiling.
 *
 * Runs against the REAL database over a direct connection, because the whole
 * class of bug here lives in Postgres behaviour: role identity (current_user),
 * SECURITY DEFINER vs INVOKER, JWT claim inspection via request.jwt.claims,
 * RLS policies and column defaults. A mocked version of this suite would have
 * passed while the ceiling was wide open.
 *
 * Harness discipline (see mem://security/verification-harness-rules):
 *  - every row is created by the harness and addressed by its own id;
 *  - nothing is ever scoped by tenant_id alone;
 *  - the entire run happens inside ONE transaction that is ALWAYS rolled back,
 *    including notification side effects, so no real row can be touched.
 */

type Expect = "allow" | "deny";
interface Case {
  id: string;
  group: "agent_refusal" | "human_success" | "revision_loop" | "dispatcher" | "adjacent";
  path: string;
  desc: string;
  role: "service_role" | "authenticated" | "anon";
  claims: string | null;
  expect: Expect;
  sql: string;
  /** Required error-text prefix for deny cases. A refusal for the wrong
   *  reason (RLS, NOT NULL, typo) must NOT count as a pass. */
  pattern?: string;
}

const uuid = () => crypto.randomUUID();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Keep the endpoint off the open internet. The body contains only case
  // names and pass/fail booleans, never secrets.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const hdr = req.headers.get("Authorization") || "";
  const presented = hdr.startsWith("Bearer ") ? hdr.slice(7) : req.headers.get("apikey") || "";
  let authorized = presented !== "" && (presented === serviceKey || presented === anonKey);
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

  // Optional fault injection, used to prove the suite goes red on the real
  // regressions rather than only passing on the happy path. Each fault is
  // applied INSIDE the rolled-back transaction, so the live ceiling is never
  // weakened, not even for a moment on another connection.
  let fault = "";
  try {
    fault = (await req.json())?.fault ?? "";
  } catch (_) { /* no body */ }

  const client = new Client(Deno.env.get("SUPABASE_DB_URL")!);
  await client.connect();
  const results: any[] = [];
  try {
    await client.queryArray("BEGIN");

    const t = await client.queryObject<{ tenant_id: string; user_id: string }>(`
      SELECT ta.tenant_id, ta.user_id
        FROM public.tenant_admins ta
        JOIN public.tenants t ON t.id = ta.tenant_id
        JOIN auth.users u ON u.id = ta.user_id
       ORDER BY (t.slug = 'acme-broadband') DESC, ta.tenant_id
       LIMIT 1`);
    if (!t.rows.length) throw new Error("no usable tenant_admins row to impersonate");
    const tenant = t.rows[0].tenant_id;
    const uid = t.rows[0].user_id;

    const humanClaims = JSON.stringify({ sub: uid, role: "authenticated" });
    const agentClaims = JSON.stringify({ sub: uid, role: "authenticated", client_id: "selftest-mcp-client" });

    // ---- fault injection (transaction-local DDL, rolled back with everything else)
    if (fault === "security_definer") {
      // Reintroduces the original defect: SECURITY DEFINER rewrites current_user
      // to the function owner, so every caller looks like a direct DB role.
      await client.queryArray(
        `ALTER FUNCTION public.is_agent_actor() SECURITY DEFINER`,
      );
    } else if (fault === "drop_claim_check") {
      // Removes the client_id inspection: the OAuth MCP path stops being
      // recognised as an agent and inherits the human's approve rights.
      await client.queryArray(`
        CREATE OR REPLACE FUNCTION public.is_agent_actor() RETURNS boolean
        LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $f$
        DECLARE raw text; claims jsonb;
        BEGIN
          IF current_user NOT IN ('anon','authenticated','service_role') THEN RETURN false; END IF;
          raw := nullif(current_setting('request.jwt.claims', true), '');
          IF raw IS NULL THEN RETURN true; END IF;
          claims := raw::jsonb;
          IF (claims->>'sub') IS NULL THEN RETURN true; END IF;
          RETURN false;
        END; $f$;`);
    } else if (fault === "drop_insert_guard") {
      // Restores the pre-fix shape where only UPDATEs were gated, so an INSERT
      // that merely omits status lands on the publishable 'pending' default.
      await client.queryArray(
        `DROP TRIGGER IF EXISTS trg_review_ceiling_scheduled_posts ON public.scheduled_posts;
         CREATE TRIGGER trg_review_ceiling_scheduled_posts
         BEFORE UPDATE ON public.scheduled_posts
         FOR EACH ROW EXECUTE FUNCTION public.enforce_review_ceiling_scheduled_posts();`,
      );
    }

    // ---------------- harness-owned rows ----------------
    const cPending = uuid(), cHuman = uuid();
    const aRunner = uuid(), aHuman = uuid();
    const pRAppr = uuid(), pOAppr = uuid(), pHAppr = uuid(), pHRej = uuid();
    const pRRev = uuid(), pORev = uuid(), pDPub = uuid(), pDFail = uuid();

    await client.queryArray(
      `INSERT INTO public.marketing_campaigns (id, tenant_id, title, created_by, status, agent_source, proposed_by)
       VALUES ($1,$3,'__ceiling_selftest__ pending',$4,'pending_review','selftest',$4),
              ($2,$3,'__ceiling_selftest__ human',  $4,'pending_review','selftest',$4)`,
      [cPending, cHuman, tenant, uid],
    );
    for (const a of [aRunner, aHuman]) {
      await client.queryArray(
        `INSERT INTO public.tenant_marketing_assets (id, tenant_id, file_name, file_path, url, created_by, is_published, agent_source, proposed_by)
         VALUES ($1::uuid,$2::uuid,'__ceiling_selftest__.png','__ceiling_selftest__/'||$1::text||'.png',
                 'https://example.invalid/__ceiling_selftest__/'||$1::text||'.png',$3::uuid,false,'selftest',$3::uuid)`,
        [a, tenant, uid],
      );
    }
    const posts: [string, string][] = [
      [pRAppr, "pending_review"], [pOAppr, "pending_review"],
      [pHAppr, "pending_review"], [pHRej, "pending_review"],
      [pRRev, "rejected"], [pORev, "rejected"],
      [pDPub, "pending"], [pDFail, "pending"],
    ];
    for (const [id, status] of posts) {
      await client.queryArray(
        `INSERT INTO public.scheduled_posts (id, tenant_id, user_id, platform, image_url, scheduled_at, status, agent_source, proposed_by)
         VALUES ($1,$2,$3,'facebook','https://example.invalid/x.png', now() + interval '30 days', $4,'selftest',$3)`,
        [id, tenant, uid, status],
      );
    }

    // ---------------- the 16-case matrix (+4 adjacent) ----------------
    const insertPost = (withStatus: boolean) =>
      `INSERT INTO public.scheduled_posts (tenant_id,user_id,platform,image_url,scheduled_at,${withStatus ? "status," : ""}agent_source)
       VALUES ('${tenant}','${uid}','facebook','https://example.invalid/x.png', now()+interval '30 days',${withStatus ? "'pending'," : ""}'selftest')`;

    const cases: Case[] = [
      // 8 agent refusals: 4 shapes x 2 agent paths
      { id: "A1-runner", group: "agent_refusal", path: "runner (service_role)", role: "service_role", claims: null, expect: "deny",
        desc: "insert scheduled_post with an explicit publishable status", sql: insertPost(true) },
      { id: "A2-runner", group: "agent_refusal", path: "runner (service_role)", role: "service_role", claims: null, expect: "deny",
        desc: "insert scheduled_post OMITTING status (column default 'pending' is publishable)", sql: insertPost(false) },
      { id: "A3-runner", group: "agent_refusal", path: "runner (service_role)", role: "service_role", claims: null, expect: "deny",
        desc: "approve itself: pending_review -> pending", sql: `UPDATE public.scheduled_posts SET status='pending' WHERE id='${pRAppr}'` },
      { id: "A4-runner", group: "agent_refusal", path: "runner (service_role)", role: "service_role", claims: null, expect: "deny",
        desc: "publish an asset: is_published false -> true", sql: `UPDATE public.tenant_marketing_assets SET is_published=true WHERE id='${aRunner}'` },
      { id: "A1-oauth", group: "agent_refusal", path: "oauth mcp (authenticated + client_id)", role: "authenticated", claims: agentClaims, expect: "deny",
        desc: "insert scheduled_post with an explicit publishable status", sql: insertPost(true) },
      { id: "A2-oauth", group: "agent_refusal", path: "oauth mcp (authenticated + client_id)", role: "authenticated", claims: agentClaims, expect: "deny",
        desc: "insert scheduled_post OMITTING status (publishable default)", sql: insertPost(false) },
      { id: "A3-oauth", group: "agent_refusal", path: "oauth mcp (authenticated + client_id)", role: "authenticated", claims: agentClaims, expect: "deny",
        desc: "approve itself: pending_review -> pending", sql: `UPDATE public.scheduled_posts SET status='pending' WHERE id='${pOAppr}'` },
      { id: "A4-oauth", group: "agent_refusal", path: "oauth mcp (authenticated + client_id)", role: "authenticated", claims: agentClaims, expect: "deny",
        desc: "publish a campaign: is_published false -> true", sql: `UPDATE public.marketing_campaigns SET is_published=true, status='published' WHERE id='${cPending}'` },

      // 4 human successes (must NOT be blocked - over-tightening check)
      { id: "H1", group: "human_success", path: "dashboard (authenticated, no client_id)", role: "authenticated", claims: humanClaims, expect: "allow",
        desc: "tenant admin approves a post: pending_review -> pending", sql: `UPDATE public.scheduled_posts SET status='pending' WHERE id='${pHAppr}'` },
      { id: "H2", group: "human_success", path: "dashboard (authenticated, no client_id)", role: "authenticated", claims: humanClaims, expect: "allow",
        desc: "tenant admin rejects a post with feedback", sql: `UPDATE public.scheduled_posts SET status='rejected', feedback_note='selftest' WHERE id='${pHRej}'` },
      { id: "H3", group: "human_success", path: "dashboard (authenticated, no client_id)", role: "authenticated", claims: humanClaims, expect: "allow",
        desc: "tenant admin approves and publishes a campaign", sql: `UPDATE public.marketing_campaigns SET status='approved', is_published=true WHERE id='${cHuman}'` },
      { id: "H4", group: "human_success", path: "dashboard (authenticated, no client_id)", role: "authenticated", claims: humanClaims, expect: "allow",
        desc: "tenant admin publishes an asset", sql: `UPDATE public.tenant_marketing_assets SET is_published=true WHERE id='${aHuman}'` },

      // 2 revision-loop cases (agent writes that legitimately touch status)
      { id: "V1", group: "revision_loop", path: "runner (service_role)", role: "service_role", claims: null, expect: "allow",
        desc: "agent returns a rejected post to pending_review", sql: `UPDATE public.scheduled_posts SET status='pending_review', caption='revised' WHERE id='${pRRev}'` },
      { id: "V2", group: "revision_loop", path: "oauth mcp (authenticated + client_id)", role: "authenticated", claims: agentClaims, expect: "allow",
        desc: "agent returns a rejected post to pending_review", sql: `UPDATE public.scheduled_posts SET status='pending_review', caption='revised' WHERE id='${pORev}'` },

      // 2 dispatcher cases (already past the gate, must still move)
      { id: "D1", group: "dispatcher", path: "publisher (service_role)", role: "service_role", claims: null, expect: "allow",
        desc: "carry an approved post forward: pending -> published", sql: `UPDATE public.scheduled_posts SET status='published', published_at=now() WHERE id='${pDPub}'` },
      { id: "D2", group: "dispatcher", path: "publisher (service_role)", role: "service_role", claims: null, expect: "allow",
        desc: "mark an approved post failed: pending -> failed", sql: `UPDATE public.scheduled_posts SET status='failed', error_message='selftest' WHERE id='${pDFail}'` },

      // adjacent guarantees fixed earlier this week (cheap to co-locate)
      { id: "X1", group: "adjacent", path: "anon", role: "anon", claims: null, expect: "deny", pattern: "permission denied",
        desc: "anon cannot read tenants.contact_email (column-level grant)", sql: `SELECT contact_email FROM public.tenants LIMIT 1` },
      { id: "X2", group: "adjacent", path: "anon", role: "anon", claims: null, expect: "deny", pattern: "permission denied",
        desc: "anon cannot execute the guarded registration-count aggregate", sql: `SELECT public.get_tournament_registration_counts(ARRAY[]::uuid[])` },
      { id: "X3", group: "adjacent", path: "anon", role: "anon", claims: null, expect: "allow",
        desc: "the public capacity aggregate stays callable by anon", sql: `SELECT public.get_tournament_capacity(ARRAY[]::uuid[])` },
      { id: "X4", group: "adjacent", path: "anon", role: "anon", claims: null, expect: "deny", pattern: "permission denied",
        desc: "anon cannot reach social_connections at all (stored token exposure)",
        sql: `SELECT 1 FROM public.social_connections LIMIT 1` },
    ];

    for (const c of cases) {
      let passed = false;
      let detail = "";
      let sqlstate: string | null = null;
      await client.queryArray("SAVEPOINT sp");
      try {
        await client.queryArray(`SET LOCAL ROLE ${c.role}`);
        await client.queryArray("SELECT set_config('request.jwt.claims', $1::text, true)", [c.claims]);
        await client.queryArray(c.sql);
        passed = c.expect === "allow";
        detail = passed ? "statement succeeded, as required" : "STATEMENT SUCCEEDED BUT SHOULD HAVE BEEN REFUSED";
      } catch (e: any) {
        detail = e?.fields?.message ?? (e instanceof Error ? e.message : String(e));
        // Record the SQLSTATE so a refusal can be shown to be an authorization
        // refusal (42501) rather than a constraint or typo.
        sqlstate = e?.fields?.code ?? null;
        if (c.expect === "allow") {
          passed = false;
          detail = `statement was REFUSED but must succeed: ${detail}`;
        } else {
          const pattern = c.pattern ?? "review ceiling";
          passed = detail.startsWith(pattern);
          if (!passed) detail = `refused for the WRONG reason (expected "${pattern}..."): ${detail}`;
        }
      }
      // Undo the case unconditionally: allow-cases must not leak state into
      // later cases, deny-cases that wrongly succeeded must not persist.
      await client.queryArray("ROLLBACK TO SAVEPOINT sp");
      await client.queryArray("RESET ROLE");
      results.push({ id: c.id, group: c.group, path: c.path, case: c.desc, expect: c.expect, passed, sqlstate, detail });
    }
  } catch (e) {
    return await finish(client, {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      cases: results,
    }, 500);
  }

  const failed = results.filter((r) => !r.passed);
  const body = {
    ok: failed.length === 0,
    fault: fault || null,
    total: results.length,
    failed: failed.length,
    cases: results,
  };
  if (failed.length) console.error("[review-ceiling-selftest] FAILED", JSON.stringify(failed));
  return await finish(client, body, failed.length ? 500 : 200);
});

async function finish(client: Client, body: unknown, status: number) {
  try {
    await client.queryArray("ROLLBACK");
  } catch (_) { /* connection already unwound */ }
  try {
    await client.end();
  } catch (_) { /* ignore */ }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
