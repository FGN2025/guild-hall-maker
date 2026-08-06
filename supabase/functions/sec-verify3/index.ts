// TEMPORARY security verification harness — delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(URL_, SRK, { auth: { persistSession: false } });

const TENANT_A = "17f13946-7c7b-4b0c-b58a-5eec8bfd4db3"; // Adams Fiber
const TENANT_B = "e9c0f4b8-e8e8-45fb-983d-756bd0d3584c"; // NineStar Connect

async function mkUser(email: string, pw: string, tenant: string | null) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: pw, email_confirm: true,
    user_metadata: { display_name: email.split("@")[0] },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const id = data.user!.id;
  if (tenant) {
    const { error: e2 } = await admin.from("user_service_interests")
      .insert({ user_id: id, tenant_id: tenant, status: "new" });
    if (e2) throw new Error(`membership ${email}: ${e2.message}`);
  }
  return id;
}

async function client(email: string, pw: string) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: pw });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const out: any = { cases: [] };
  const stamp = Date.now();
  const pw = `Probe!${stamp}aA1`;
  const emails = {
    a: `lb-probe-a-${stamp}@fgn-test.dev`,
    b: `lb-probe-b-${stamp}@fgn-test.dev`,
    c: `lb-probe-fgn-${stamp}@fgn-test.dev`,
  };
  const ids: Record<string, string> = {};
  try {
    ids.a = await mkUser(emails.a, pw, TENANT_A);
    ids.b = await mkUser(emails.b, pw, TENANT_B);
    ids.c = await mkUser(emails.c, pw, null);

    // remove any auto-enrolment the signup trigger may have added for the FGN-only user
    await admin.from("user_service_interests").delete().eq("user_id", ids.c);

    const { data: season } = await admin.from("seasons")
      .select("id,status,name").eq("status", "active").limit(1).maybeSingle();
    out.season = season;

    if (season) {
      for (const [k, pts] of [["a", 111], ["b", 222], ["c", 333]] as const) {
        await admin.from("season_scores").upsert(
          { season_id: season.id, user_id: ids[k], points: pts, wins: 3, losses: 1, tournaments_played: 4 },
          { onConflict: "season_id,user_id" },
        );
      }
    }

    const anonC = createClient(URL_, ANON, { auth: { persistSession: false } });
    const cA = await client(emails.a, pw);
    const cB = await client(emails.b, pw);
    const cC = await client(emails.c, pw);

    const rec = (name: string, r: any, extra?: any) => out.cases.push({
      name,
      error: r.error ? { code: r.error.code, message: r.error.message } : null,
      rows: Array.isArray(r.data) ? r.data.length : (r.data ? 1 : 0),
      ...extra,
    });

    // --- anonymous must be refused on every aggregate
    rec("anon get_leaderboard_standings", await anonC.rpc("get_leaderboard_standings", { _limit: 10 }));
    rec("anon get_season_standings", await anonC.rpc("get_season_standings", { _season_id: season?.id, _limit: 10 }));
    rec("anon get_season_stats_summary", await anonC.rpc("get_season_stats_summary", { _season_id: season?.id }));
    rec("anon get_season_progression", await anonC.rpc("get_season_progression"));

    // --- over-tightening check: FGN-only player sees a FULL board
    const cAll = await cC.rpc("get_leaderboard_standings", { _limit: 500 });
    rec("FGN-only player get_leaderboard_standings", cAll, {
      sees_tenantA_probe: (cAll.data ?? []).some((r: any) => r.user_id === ids.a),
      sees_tenantB_probe: (cAll.data ?? []).some((r: any) => r.user_id === ids.b),
    });
    const cSeason = await cC.rpc("get_season_standings", { _season_id: season?.id, _limit: 500 });
    rec("FGN-only player get_season_standings", cSeason, {
      sees_tenantA_probe: (cSeason.data ?? []).some((r: any) => r.user_id === ids.a),
      sees_tenantB_probe: (cSeason.data ?? []).some((r: any) => r.user_id === ids.b),
    });

    // --- tenant A member gets the full board too
    const aAll = await cA.rpc("get_leaderboard_standings", { _limit: 500 });
    rec("tenantA member get_leaderboard_standings", aAll, {
      sees_tenantB_probe: (aAll.data ?? []).some((r: any) => r.user_id === ids.b),
      sample: (aAll.data ?? []).filter((r: any) => r.user_id === ids.b),
    });

    // --- but NO raw row-level cross-tenant read on any of the three tables
    rec("tenantA raw season_scores -> tenantB user",
      await cA.from("season_scores").select("*").eq("user_id", ids.b));
    rec("tenantA raw season_snapshots -> tenantB user",
      await cA.from("season_snapshots").select("*").eq("user_id", ids.b));
    rec("tenantA raw tournament_placements -> tenantB user",
      await cA.from("tournament_placements").select("*").eq("user_id", ids.b));
    rec("tenantA raw season_scores (unfiltered) count",
      await cA.from("season_scores").select("user_id"));
    rec("FGN-only raw season_scores (unfiltered) count",
      await cC.from("season_scores").select("user_id"));

    // --- self read still works (over-tightening check on the tables)
    rec("tenantA raw season_scores -> self",
      await cA.from("season_scores").select("*").eq("user_id", ids.a));
    rec("tenantB raw season_scores -> self",
      await cB.from("season_scores").select("*").eq("user_id", ids.b));

    // --- summary aggregates
    rec("tenantA get_season_stats_summary", await cA.rpc("get_season_stats_summary", { _season_id: season?.id }));
    rec("FGN-only get_season_progression", await cC.rpc("get_season_progression"));

    out.ids = ids;
  } catch (e) {
    out.fatal = String(e);
  } finally {
    for (const id of Object.values(ids)) {
      await admin.from("season_scores").delete().eq("user_id", id);
      await admin.from("user_service_interests").delete().eq("user_id", id);
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    out.cleanup = "synthetic users deleted";
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
