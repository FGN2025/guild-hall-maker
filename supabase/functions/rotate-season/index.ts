import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Optionally accept a game_id to rotate a specific game's season
    let targetGameId: string | null = null;
    try {
      const body = await req.json();
      targetGameId = body.game_id ?? null;
    } catch {
      // No body is fine — rotate all expired seasons
    }

    // Find active seasons (optionally filtered by game_id)
    let query = supabase
      .from("seasons")
      .select("*")
      .eq("status", "active");

    if (targetGameId) {
      query = query.eq("game_id", targetGameId);
    }

    const { data: activeSeasons, error: sErr } = await query;
    if (sErr) throw sErr;

    if (!activeSeasons || activeSeasons.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No active seasons found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const results: string[] = [];

    for (const activeSeason of activeSeasons) {
      const endDate = new Date(activeSeason.end_date);
      if (now < endDate) {
        results.push(`${activeSeason.name}: still active`);
        continue;
      }

      // Get all scores for this season, ranked by points
      const { data: scores } = await supabase
        .from("season_scores")
        .select("*")
        .eq("season_id", activeSeason.id)
        .order("points", { ascending: false });

      const rankedScores = scores ?? [];

      // Assign tiers: top 5% platinum, top 15% gold, top 35% silver, top 60% bronze
      const total = rankedScores.length;
      const snapshots = rankedScores.map((s, i) => {
        const rank = i + 1;
        const percentile = total > 0 ? rank / total : 1;
        let tier = "none";
        if (percentile <= 0.05) tier = "platinum";
        else if (percentile <= 0.15) tier = "gold";
        else if (percentile <= 0.35) tier = "silver";
        else if (percentile <= 0.60) tier = "bronze";

        return {
          season_id: activeSeason.id,
          user_id: s.user_id,
          final_rank: rank,
          final_points: s.points,
          tier,
          wins: s.wins,
          losses: s.losses,
        };
      });

      // Insert snapshots
      if (snapshots.length > 0) {
        const { error: snapErr } = await supabase
          .from("season_snapshots")
          .insert(snapshots);
        if (snapErr) throw snapErr;
      }

      // Mark season as completed
      await supabase
        .from("seasons")
        .update({ status: "completed" })
        .eq("id", activeSeason.id);

      results.push(`${activeSeason.name}: completed, ${snapshots.length} players ranked`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: results.join("; "),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Season rotation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
