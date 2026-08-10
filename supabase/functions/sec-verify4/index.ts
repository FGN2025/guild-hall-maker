// ONE-OFF harness. Two jobs, both scoped and both disposable:
//   POST {"job":"rls"}    -> synthetic-user proof of the manager read widening
//   POST {"job":"purge"}  -> deletes exactly the 14 named August objects
// Deleted at the end of this turn.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const TENANT = "41a2e493-079a-4a17-a3a9-aebdd5fe5f81";

const PURGE = [
  "spotcheck/plate-exemplar-01cfd7af-2881-4efe-80ad-0ee225f266c7.png",
  "review/2026-08-06T22-11-39-631Z/01-portrait-prizepool.png",
  "review/2026-08-06T22-11-39-631Z/02-portrait-gamenight-noprize.png",
  "review/2026-08-06T22-11-45-376Z/01-portrait-prizepool.png",
  "review/2026-08-06T22-11-45-376Z/02-portrait-gamenight-noprize.png",
  "review/2026-08-06T22-11-50-227Z/01-portrait-prizepool.png",
  "review/v5-typescale/01-portrait-prizepool.png",
  "review/v5-typescale/02-portrait-gamenight-noprize.png",
  "review/v5-typescale/03-square-prizepool.png",
  "review/v5-typescale/04-landscape-prizepool.png",
  "review/v5-typescale/05-portrait-longtitle.png",
  "review/v5-typescale/06-portrait-zero-prize.png",
  "agent/2026/08/v6-typescale-promo-e0c3ce77-0665-40a9-8fa0-319e06adaf2e-announce-833cf0b5-86ad-4d37-9a9c-348c5d0e30fa-plate.png",
  "agent/2026/08/v6-typescale-promo-e0c3ce77-0665-40a9-8fa0-319e06adaf2e-day-of-97c748f1-1831-4b7d-934b-3ff78b035d28-plate.png",
].map((p) => `${TENANT}/${p}`);

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

async function mkUser(role: string | null, tenantId: string | null) {
  const email = `secverify4-${role ?? "none"}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  if (role && tenantId) {
    const { error: e2 } = await admin.from("tenant_admins").insert({ tenant_id: tenantId, user_id: data.user.id, role });
    if (e2) throw e2;
  }
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: e3 } = await c.auth.signInWithPassword({ email, password });
  if (e3) throw e3;
  return { id: data.user.id, email, client: c };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const out: Record<string, unknown> = {};
  try {
    if (body.job === "rls") {
      const cases: any[] = [];
      const made: string[] = [];
      for (const [label, role, tid] of [
        ["manager_in_tenant (should now READ)", "manager", TENANT],
        ["admin_in_tenant (over-tightening check)", "admin", TENANT],
        ["non_member (must be REFUSED)", null, null],
      ] as const) {
        const u = await mkUser(role, tid);
        made.push(u.id);
        const sel = await u.client.from("tenant_marketing_assets").select("id").eq("tenant_id", TENANT).limit(100);
        const ins = await u.client.from("tenant_marketing_assets").insert({
          tenant_id: TENANT, file_name: "x", file_path: "x", url: "x", label: "x", created_by: u.id,
        }).select("id");
        const upd = await u.client.from("tenant_marketing_assets").update({ label: "hijack" }).eq("tenant_id", TENANT).select("id");
        const del = await u.client.from("tenant_marketing_assets").delete().eq("tenant_id", TENANT).select("id");
        cases.push({
          case: label,
          select_rows: sel.data?.length ?? 0,
          select_error: sel.error?.message ?? null,
          insert_rows: ins.data?.length ?? 0,
          insert_error: ins.error?.message ?? null,
          update_rows: upd.data?.length ?? 0,
          update_error: upd.error?.message ?? null,
          delete_rows: del.data?.length ?? 0,
          delete_error: del.error?.message ?? null,
        });
      }
      for (const id of made) await admin.auth.admin.deleteUser(id);
      out.cases = cases;
      out.users_deleted = made.length;
      const { data: residue } = await admin.from("tenant_admins").select("user_id").eq("tenant_id", TENANT);
      out.tenant_admins_now = residue?.length ?? 0;
    } else if (body.job === "purge") {
      const { data, error } = await admin.storage.from("tenant-marketing").remove(PURGE);
      if (error) throw error;
      out.requested = PURGE.length;
      out.removed = data?.length ?? 0;
      out.removed_paths = (data ?? []).map((d: any) => d.name);
    } else {
      out.error = "unknown job";
    }
    return Response.json(out, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : JSON.stringify(e) }, { status: 500, headers: corsHeaders });
  }
});
