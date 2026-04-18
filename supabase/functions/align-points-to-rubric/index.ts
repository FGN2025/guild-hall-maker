import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "beginner" | "intermediate" | "advanced";
type ChallengeType = "daily" | "weekly" | "monthly" | "one_time";

interface Rubric {
  challenges: Record<Difficulty, Record<ChallengeType, number>>;
  quests: Record<Difficulty, Record<ChallengeType, number>>;
  tournaments: {
    participation: Record<Difficulty, number>;
    placement_multipliers: { first: number; second: number; third: number };
  };
  version: number;
}

const normD = (d: any): Difficulty => {
  const v = String(d ?? "beginner").toLowerCase();
  return v === "intermediate" || v === "advanced" ? v : "beginner";
};
const normT = (t: any): ChallengeType => {
  const v = String(t ?? "one_time").toLowerCase();
  return ["daily", "weekly", "monthly", "one_time"].includes(v) ? (v as ChallengeType) : "one_time";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supa.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    // Verify admin role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;

    // Load rubric
    const { data: settingRow } = await admin
      .from("app_settings").select("value").eq("key", "points_rubric_config").maybeSingle();
    if (!settingRow?.value) {
      return new Response(JSON.stringify({ error: "Rubric not configured" }), { status: 400, headers: corsHeaders });
    }
    const rubric: Rubric = JSON.parse(settingRow.value);

    const batchId = crypto.randomUUID();
    const changes: Array<{ item_type: string; item_id: string; field_name: string; old_value: number; new_value: number }> = [];

    // CHALLENGES
    const { data: challenges } = await admin
      .from("challenges")
      .select("id, points_reward, difficulty, challenge_type, points_override_reason");
    for (const c of challenges ?? []) {
      if (c.points_override_reason) continue;
      const rec = rubric.challenges[normD(c.difficulty)][normT(c.challenge_type)];
      if (c.points_reward !== rec) {
        changes.push({ item_type: "challenge", item_id: c.id, field_name: "points_reward", old_value: c.points_reward, new_value: rec });
        if (!dryRun) {
          await admin.from("challenges").update({ points_reward: rec, points_first: rec }).eq("id", c.id);
        }
      }
    }

    // QUESTS
    const { data: quests } = await admin
      .from("quests")
      .select("id, points_reward, difficulty, quest_type, points_override_reason");
    for (const q of quests ?? []) {
      if (q.points_override_reason) continue;
      const rec = rubric.quests[normD(q.difficulty)][normT((q as any).quest_type)];
      if (q.points_reward !== rec) {
        changes.push({ item_type: "quest", item_id: q.id, field_name: "points_reward", old_value: q.points_reward, new_value: rec });
        if (!dryRun) {
          await admin.from("quests").update({ points_reward: rec }).eq("id", q.id);
        }
      }
    }

    // TOURNAMENTS
    const { data: tournaments } = await admin
      .from("tournaments")
      .select("id, points_first, points_second, points_third, points_participation, difficulty, points_override_reason");
    const mults = rubric.tournaments.placement_multipliers;
    for (const t of tournaments ?? []) {
      if (t.points_override_reason) continue;
      const base = rubric.tournaments.participation[normD((t as any).difficulty)];
      const targets = {
        points_participation: base,
        points_first: Math.round(base * mults.first),
        points_second: Math.round(base * mults.second),
        points_third: Math.round(base * mults.third),
      };
      const updates: Record<string, number> = {};
      for (const [field, target] of Object.entries(targets)) {
        const current = (t as any)[field] ?? 0;
        if (current !== target) {
          changes.push({ item_type: "tournament", item_id: t.id, field_name: field, old_value: current, new_value: target });
          updates[field] = target;
        }
      }
      if (!dryRun && Object.keys(updates).length > 0) {
        await admin.from("tournaments").update(updates).eq("id", t.id);
      }
    }

    // Always log (even dry runs, tagged with batch id) — but only for live runs
    if (!dryRun && changes.length > 0) {
      await admin.from("points_realignment_log").insert(
        changes.map((c) => ({
          ...c,
          rubric_version: rubric.version ?? 1,
          performed_by: userId,
          batch_id: batchId,
        })),
      );
    }

    return new Response(
      JSON.stringify({
        dry_run: dryRun,
        batch_id: batchId,
        changes_count: changes.length,
        sample: changes.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("align-points-to-rubric error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
