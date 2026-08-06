// TEMPORARY security probe. Creates three synthetic users, measures what each
// can read of Acme's marketing data under RLS, then deletes them.
// Deleted immediately after the run — not part of the shipped surface.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const ACME = "41a2e493-079a-4a17-a3a9-aebdd5fe5f81";
const OTHER = "17f13946-7c7b-4b0c-b58a-5eec8bfd4db3"; // Adams Fiber

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

async function mkUser(tag: string) {
  const email = `rls-probe-${tag}-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID() + "aA1!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return { id: data.user!.id, email, password };
}

async function probe(email: string, password: string) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: s, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const jwtSub = s.user!.id;

  const camp = await c.from("marketing_campaigns").select("id", { count: "exact", head: true }).eq("tenant_id", ACME);
  const tma = await c.from("tenant_marketing_assets").select("id", { count: "exact", head: true }).eq("tenant_id", ACME);
  const posts = await c.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("tenant_id", ACME);
  const massets = await c.from("marketing_assets").select("id", { count: "exact", head: true });

  await c.auth.signOut();
  return {
    jwt_sub: jwtSub,
    acme_campaigns: camp.count ?? 0,
    acme_tenant_assets: tma.count ?? 0,
    acme_scheduled_posts: posts.count ?? 0,
    visible_marketing_assets: massets.count ?? 0,
    errors: [camp.error?.message, tma.error?.message, posts.error?.message, massets.error?.message].filter(Boolean),
  };
}

Deno.serve(async () => {
  const created: string[] = [];
  try {
    const a = await mkUser("othertenant"); created.push(a.id);
    const b = await mkUser("nomember"); created.push(b.id);
    const c = await mkUser("acme"); created.push(c.id);

    // handle_new_user seeds a profile that can trip prevent_player_tenant_admin;
    // clear the player markers so these synthetics can be real tenant staff.
    await admin.from("profiles").update({ zip_code: null }).in("user_id", created);
    await admin.from("user_service_interests").delete().in("user_id", created);
    await admin.from("tenant_subscribers").delete().in("user_id", created);

    const ins = await admin.from("tenant_admins").insert([
      { tenant_id: OTHER, user_id: a.id, role: "admin" },
      { tenant_id: ACME, user_id: c.id, role: "admin" },
    ]).select("id, tenant_id, user_id, role");
    const membership = { error: ins.error?.message ?? null, rows: ins.data ?? [] };

    const results = {
      case1_different_tenant_member: { email: a.email, ...(await probe(a.email, a.password)) },
      case2_no_membership: { email: b.email, ...(await probe(b.email, b.password)) },
      case3_acme_member: { email: c.email, ...(await probe(c.email, c.password)) },
    };

    // cleanup
    await admin.from("tenant_admins").delete().in("user_id", created);
    for (const id of created) await admin.auth.admin.deleteUser(id);
    const { count: leftover } = await admin
      .from("tenant_admins")
      .select("id", { count: "exact", head: true })
      .in("user_id", created);

    return new Response(JSON.stringify({ results, membership, cleanup: { deleted_users: created, leftover_admin_rows: leftover ?? 0 } }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    for (const id of created) { try { await admin.auth.admin.deleteUser(id); } catch { /* ignore */ } }
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
