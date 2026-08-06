// TEMPORARY security verification harness. Deleted at the end of this checkpoint.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

async function mkUser(email: string) {
  const pw = crypto.randomUUID() + "Aa1!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password: pw, email_confirm: true,
  });
  if (error) throw new Error(`create ${email}: ${error.message}`);
  return { id: data.user!.id, email, pw };
}

async function tokenFor(u: { email: string; pw: string }) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email: u.email, password: u.pw });
  if (error) throw new Error(`signin ${u.email}: ${error.message}`);
  return data.session!.access_token;
}

async function rest(path: string, token: string) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  const body = await r.text();
  return { status: r.status, body: body.slice(0, 400) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const out: Record<string, unknown> = {};
  const created: string[] = [];
  try {
    // pick two distinct tenants
    const { data: tenants } = await admin.from("tenants").select("id,slug").limit(2);
    const [tA, tB] = tenants!;
    out.tenants = tenants;

    const stamp = Date.now();
    const inA = await mkUser(`sec2-inA-${stamp}@fgn-test.dev`);
    const inA2 = await mkUser(`sec2-inA2-${stamp}@fgn-test.dev`);
    const inB = await mkUser(`sec2-inB-${stamp}@fgn-test.dev`);
    const none = await mkUser(`sec2-none-${stamp}@fgn-test.dev`);
    created.push(inA.id, inA2.id, inB.id, none.id);

    await admin.from("user_service_interests").insert([
      { user_id: inA.id, tenant_id: tA.id },
      { user_id: inA2.id, tenant_id: tA.id },
      { user_id: inB.id, tenant_id: tB.id },
    ]);

    // target row owner = inA2 (member of tenant A)
    const { data: season } = await admin.from("seasons").select("id").limit(1).single();
    const { data: tour } = await admin.from("tournaments").select("id").limit(1).single();

    const snap = await admin.from("season_snapshots").insert({
      season_id: season!.id, user_id: inA2.id, final_rank: 99, final_points: 1, tier: "none",
    }).select("id").single();
    const score = await admin.from("season_scores").insert({
      season_id: season!.id, user_id: inA2.id, points: 1,
    }).select("id").single();
    const place = await admin.from("tournament_placements").insert({
      tournament_id: tour!.id, place: 3, user_id: inA2.id, points_awarded: 1,
    }).select("id").single();
    out.seeded = { snap: snap.error?.message ?? snap.data?.id, score: score.error?.message ?? score.data?.id, place: place.error?.message ?? place.data?.id };

    const tokens = {
      same_tenant_member: await tokenFor(inA),
      other_tenant_member: await tokenFor(inB),
      no_membership: await tokenFor(none),
    };

    const targets = [
      ["season_snapshots", `season_snapshots?user_id=eq.${inA2.id}&select=id,final_points`],
      ["season_scores", `season_scores?user_id=eq.${inA2.id}&select=id,points`],
      ["tournament_placements", `tournament_placements?user_id=eq.${inA2.id}&select=id,points_awarded`],
    ] as const;

    const results: Record<string, unknown> = {};
    for (const [name, path] of targets) {
      const per: Record<string, unknown> = {};
      for (const [who, tok] of Object.entries(tokens)) per[who] = await rest(path, tok);
      // anon
      const ra = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
      per["anon"] = { status: ra.status, body: (await ra.text()).slice(0, 200) };
      results[name] = per;
    }
    out.results = results;

    // cleanup seeded rows
    if (snap.data) await admin.from("season_snapshots").delete().eq("id", snap.data.id);
    if (score.data) await admin.from("season_scores").delete().eq("id", score.data.id);
    if (place.data) await admin.from("tournament_placements").delete().eq("id", place.data.id);

    // Step 3: delete probe residue
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const residue = list.users.find((u) => u.email === "sec-probe-member-0806@fgn-test.dev");
    if (residue) {
      const d = await admin.auth.admin.deleteUser(residue.id);
      out.residue = { found: residue.id, deleted: !d.error, error: d.error?.message ?? null };
    } else {
      out.residue = { found: null, note: "not present" };
    }
    const { data: after } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    out.residue_after = after.users.filter((u) => u.email === "sec-probe-member-0806@fgn-test.dev").length;
  } catch (e) {
    out.error = String(e);
  } finally {
    for (const id of created) {
      await admin.from("user_service_interests").delete().eq("user_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
