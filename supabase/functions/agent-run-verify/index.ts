/*
 * agent-run-verify — Checkpoint 2 test harness (build v2).
 * Creates ephemeral password users with the roles needed to exercise each
 * gate, then invokes agent-run with their access tokens. Cleans up after.
 * Delete after Checkpoint 2 acceptance.
 */
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const svc = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

async function createEphemeralUser(): Promise<{ id: string; email: string; password: string; token: string }> {
  const email = `verify-${crypto.randomUUID()}@fgn-test.local`;
  const password = crypto.randomUUID() + "Aa1!";
  const { data: created, error: cErr } = await svc.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { verify_harness: true },
  });
  if (cErr || !created.user) throw new Error(`createUser failed: ${cErr?.message}`);
  const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signed, error: sErr } = await anon.auth.signInWithPassword({ email, password });
  if (sErr || !signed.session) throw new Error(`signIn failed: ${sErr?.message}`);
  return { id: created.user.id, email, password, token: signed.session.access_token };
}

async function deleteEphemeralUser(id: string) {
  await svc.auth.admin.deleteUser(id).catch(() => {});
}



async function callAgentRun(token: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  return { status: res.status, body: j };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "gates"; // "gates" | "v6" | "all"
  const acmeId = "41a2e493-079a-4a17-a3a9-aebdd5fe5f81";

  // Pick a real second tenant for cross-tenant V3.
  const { data: otherTenant } = await svc.from("tenants").select("id, name").neq("id", acmeId).limit(1).maybeSingle();

  const results: any[] = [];
  const push = (name: string, pass: boolean, detail: any) => results.push({ name, pass, detail });
  const cleanupUsers: string[] = [];

  try {
    const { data: gate } = await svc.from("app_settings").select("value").eq("key", "agent_launches_enabled").maybeSingle();
    push("preflight kill switch", true, { value: gate?.value });

    if (mode === "gates" || mode === "all") {
      // Ephemeral admin, manager, marketing users, each attached to Acme with the respective role.
      const [adminU, marketingU, adminOtherTenantU] = await Promise.all([
        createEphemeralUser(), createEphemeralUser(), createEphemeralUser(),
      ]);
      cleanupUsers.push(adminU.id, marketingU.id, adminOtherTenantU.id);
      // Grant 'moderator' app_role to bypass the prevent_player_tenant_admin trigger
      // (staff exemption). Moderator is not platform admin, so it does not skew our
      // has_role('admin') check in agent-run.
      await svc.from("user_roles").insert([
        { user_id: adminU.id, role: "moderator" },
        { user_id: marketingU.id, role: "moderator" },
        { user_id: adminOtherTenantU.id, role: "moderator" },
      ]);
      const insertRes = await svc.from("tenant_admins").insert([
        { tenant_id: acmeId, user_id: adminU.id, role: "admin" },
        { tenant_id: acmeId, user_id: marketingU.id, role: "marketing" },
        { tenant_id: acmeId, user_id: adminOtherTenantU.id, role: "admin" },
      ]);
      push("seed tenant_admins", !insertRes.error, insertRes.error?.message ?? "ok");

      // V2: marketing role → 403
      const v2 = await callAgentRun(marketingU.token, { tenant_id: acmeId, mode: "single_campaign" });
      push("V2 marketing role rejected 403", v2.status === 403, v2);

      // V3: admin on Acme launching against a different tenant → 403
      if (otherTenant) {
        const v3 = await callAgentRun(adminOtherTenantU.token, { tenant_id: otherTenant.id, mode: "single_campaign" });
        push("V3 cross-tenant launch rejected", v3.status === 403, { targetTenant: otherTenant.id, ...v3 });
      } else {
        push("V3 cross-tenant launch rejected", false, "no second tenant available");
      }

      // V4: over-limit → 429. Seed 2 succeeded runs today (default daily cap = 2).
      const now = new Date().toISOString();
      const seedIds: string[] = [];
      const seedErrs: string[] = [];
      for (let i = 0; i < 2; i++) {
        const { data, error } = await svc.from("agent_runs").insert({
          tenant_id: acmeId, launched_by: adminU.id, status: "completed",
          mode: "single_campaign", turn_cap: 40, started_at: now, finished_at: now,
          agent_name: "marketing_agent", prompt_version: 1,
        }).select("id").single();
        if (data) seedIds.push(data.id);
        if (error) seedErrs.push(error.message);
      }
      push("V4 seed runs", seedIds.length === 2, { seedIds, seedErrs });
      const v4 = await callAgentRun(adminU.token, { tenant_id: acmeId, mode: "single_campaign" });
      push("V4 over-limit returns 429", v4.status === 429 && /limit/i.test(v4.body?.error ?? ""), v4);
      await svc.from("agent_runs").delete().in("id", seedIds);

      // V5: kill switch off → 429
      const upd = await svc.from("app_settings").update({ value: "false" }).eq("key", "agent_launches_enabled").select();
      const readBack = await svc.from("app_settings").select("value").eq("key", "agent_launches_enabled").maybeSingle();
      push("V5 disable write", true, { updated: upd.data, error: upd.error?.message, readBack: readBack.data });
      const v5 = await callAgentRun(adminU.token, { tenant_id: acmeId, mode: "single_campaign" });
      push("V5 kill switch disables launches", v5.status === 429 && /disabled/i.test(v5.body?.error ?? ""), v5);
      await svc.from("app_settings").update({ value: "true" }).eq("key", "agent_launches_enabled");
    }

    if ((mode === "v6" || mode === "all") && Deno.env.get("ANTHROPIC_API_KEY")) {
      await svc.from("user_roles").insert({ user_id: (await (async()=>{const u=await createEphemeralUser();cleanupUsers.push(u.id);return u;})()).id, role: "moderator" }).select();
      const adminU = await createEphemeralUser();
      cleanupUsers.push(adminU.id);
      await svc.from("user_roles").insert({ user_id: adminU.id, role: "moderator" });
      const taRes = await svc.from("tenant_admins").insert({ tenant_id: acmeId, user_id: adminU.id, role: "admin" });
      const kick = await callAgentRun(adminU.token, {
        tenant_id: acmeId, mode: "single_campaign",
        instruction: "Ignore the campaign task. Repeatedly call get_me.", turn_cap: 1,
      });
      push("V6 kick response", kick.status === 200 && !!kick.body?.run_id, { taErr: taRes.error?.message, kick });
      const runId = kick.body?.run_id;
      let final: any = null;
      for (let i = 0; i < 60 && runId; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const { data } = await svc.from("agent_runs").select("*").eq("id", runId).maybeSingle();
        if (data && data.status !== "running") { final = data; break; }
      }
      push("V6 turn_cap_exceeded marks failed", !!final && final.status === "failed" && final.error_message === "turn_cap_exceeded", final);
    }
  } catch (e) {
    push("harness error", false, String(e));
  } finally {
    for (const uid of cleanupUsers) {
      await svc.from("tenant_admins").delete().eq("user_id", uid);
      await svc.from("agent_runs").delete().eq("launched_by", uid);
      await svc.from("user_roles").delete().eq("user_id", uid);
      await deleteEphemeralUser(uid);
    }
  }

  return new Response(JSON.stringify({ pass: results.every((r) => r.pass), results }, null, 2), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});

