import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-shot proof that a HUMAN approval (pending_review -> pending) produces a
 * row the cron dispatcher's exact selector picks up.
 *
 * Harness discipline (mem://security/verification-harness-rules):
 *  - the only row written is one this probe creates, addressed by its own id;
 *  - nothing is scoped by tenant_id alone;
 *  - everything runs inside ONE transaction that is ALWAYS rolled back, so the
 *    synthetic row cannot survive and no real row is ever touched.
 *
 * The selector below is copied verbatim from
 * supabase/functions/publish-scheduled-posts/index.ts:128-134
 *   .from("scheduled_posts").select("*").eq("status","pending")
 *   .lte("scheduled_at", nowIso).limit(50)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const hdr = req.headers.get("Authorization") || "";
  const presented = hdr.startsWith("Bearer ") ? hdr.slice(7) : req.headers.get("apikey") || "";
  let authorized = presented !== "" && (presented === anonKey || presented === serviceKey || presented.startsWith("sb_publishable_"));
  if (!authorized && presented.startsWith("eyJ")) {
    try {
      const p = presented.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = p.length % 4 === 0 ? "" : "=".repeat(4 - (p.length % 4));
      const role = JSON.parse(atob(p + pad)).role;
      authorized = role === "anon" || role === "service_role";
    } catch (_) { /* not a JWT */ }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const client = new Client(Deno.env.get("SUPABASE_DB_URL")!);
  await client.connect();
  const steps: any[] = [];
  try {
    await client.queryArray("BEGIN");

    const t = await client.queryObject<{ tenant_id: string; user_id: string }>(`
      SELECT ta.tenant_id, ta.user_id FROM public.tenant_admins ta
        JOIN public.tenants t ON t.id = ta.tenant_id
        JOIN auth.users u ON u.id = ta.user_id
       ORDER BY (t.slug = 'acme-broadband') DESC, ta.tenant_id LIMIT 1`);
    const { tenant_id: tenant, user_id: uid } = t.rows[0];
    const synthetic = crypto.randomUUID();
    const humanClaims = JSON.stringify({ sub: uid, role: "authenticated" });

    // 1. Agent-shaped insert of the synthetic draft (ceiling-legal: pending_review).
    await client.queryArray(
      `INSERT INTO public.scheduled_posts
         (id, tenant_id, user_id, platform, image_url, caption, scheduled_at, status, agent_source, proposed_by)
       VALUES ($1,$2,$3,'facebook','https://example.invalid/synthetic.png',
               'SYNTHETIC dispatcher-selector probe — never published',
               now() - interval '1 minute', 'pending_review', 'probe', $3)`,
      [synthetic, tenant, uid],
    );
    steps.push({ step: "insert draft", id: synthetic, status: "pending_review" });

    // 2. Human approval, exactly the patch useDraftDecision.ts now writes.
    await client.queryArray(`SET LOCAL ROLE authenticated`);
    await client.queryArray("SELECT set_config('request.jwt.claims', $1::text, true)", [humanClaims]);
    await client.queryArray(
      `UPDATE public.scheduled_posts SET status='pending', feedback_note=NULL WHERE id=$1`, [synthetic]);
    await client.queryArray("RESET ROLE");
    const after = await client.queryObject(`SELECT id, status FROM public.scheduled_posts WHERE id=$1`, [synthetic]);
    steps.push({ step: "human approval (useDraftDecision patch)", result: after.rows[0] });

    // 3. The dispatcher's exact selector, as the dispatcher's role.
    await client.queryArray(`SET LOCAL ROLE service_role`);
    const picked = await client.queryObject(
      `SELECT id, status, scheduled_at, platform FROM public.scheduled_posts
        WHERE status = 'pending' AND scheduled_at <= now() ORDER BY scheduled_at LIMIT 50`);
    await client.queryArray("RESET ROLE");
    steps.push({
      step: "dispatcher selector: status='pending' AND scheduled_at <= now() LIMIT 50",
      rows: picked.rows,
      synthetic_present: picked.rows.some((r: any) => r.id === synthetic),
    });

    // 4. Cleanup: the whole transaction unwinds, so the synthetic row is gone.
    await client.queryArray("ROLLBACK");
    const gone = await client.queryObject(`SELECT count(*)::int AS n FROM public.scheduled_posts WHERE id=$1`, [synthetic]);
    steps.push({ step: "cleanup (transaction rolled back)", rows_remaining_for_synthetic_id: (gone.rows[0] as any).n });

    return new Response(JSON.stringify({ ok: true, synthetic_id: synthetic, steps }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    try { await client.queryArray("ROLLBACK"); } catch (_) { /* already unwound */ }
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), steps }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    try { await client.end(); } catch (_) { /* ignore */ }
  }
});
