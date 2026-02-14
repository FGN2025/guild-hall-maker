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

    // Find the active season
    const { data: activeSeason, error: sErr } = await supabase
      .from("seasons")
      .select("*")
      .eq("status", "active")
      .maybeSingle();

    if (sErr) throw sErr;
    if (!activeSeason) {
      return new Response(
        JSON.stringify({ success: false, message: "No active season found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if season has ended
    const now = new Date();
    const endDate = new Date(activeSeason.end_date);
    if (now < endDate) {
      return new Response(
        JSON.stringify({ success: true, message: "Season still active", season: activeSeason.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Create next month's season
    const nextStart = new Date(endDate.getTime() + 1000); // 1 second after end
    const nextEnd = new Date(nextStart);
    nextEnd.setMonth(nextEnd.getMonth() + 1);
    nextEnd.setMilliseconds(nextEnd.getMilliseconds() - 1);

    const nextName = `Season ${nextStart.getFullYear()}-${String(nextStart.getMonth() + 1).padStart(2, "0")}`;

    await supabase.from("seasons").insert({
      name: nextName,
      start_date: nextStart.toISOString(),
      end_date: nextEnd.toISOString(),
      status: "active",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Season ${activeSeason.name} completed. ${snapshots.length} players ranked. New season: ${nextName}`,
        snapshots_created: snapshots.length,
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
