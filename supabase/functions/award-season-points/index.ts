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

    const { winner_id, loser_id, points_winner, points_loser } = await req.json();
    if (!winner_id) throw new Error("winner_id required");

    // Use provided points or fall back to defaults
    const winnerPoints = typeof points_winner === "number" ? points_winner : 10;
    const loserPoints = typeof points_loser === "number" ? points_loser : 2;

    // Get active season
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("status", "active")
      .maybeSingle();

    if (!season) {
      return new Response(
        JSON.stringify({ success: false, message: "No active season" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert winner
    const { data: existingWinner } = await supabase
      .from("season_scores")
      .select("id, points, wins")
      .eq("season_id", season.id)
      .eq("user_id", winner_id)
      .maybeSingle();

    if (existingWinner) {
      await supabase.from("season_scores").update({
        points: existingWinner.points + winnerPoints,
        wins: existingWinner.wins + 1,
      }).eq("id", existingWinner.id);
    } else {
      await supabase.from("season_scores").insert({
        season_id: season.id,
        user_id: winner_id,
        points: winnerPoints,
        wins: 1,
      });
    }

    // Upsert loser
    if (loser_id && loserPoints > 0) {
      const { data: existingLoser } = await supabase
        .from("season_scores")
        .select("id, points, losses")
        .eq("season_id", season.id)
        .eq("user_id", loser_id)
        .maybeSingle();

      if (existingLoser) {
        await supabase.from("season_scores").update({
          points: existingLoser.points + loserPoints,
          losses: existingLoser.losses + 1,
        }).eq("id", existingLoser.id);
      } else {
        await supabase.from("season_scores").insert({
          season_id: season.id,
          user_id: loser_id,
          points: loserPoints,
          losses: 1,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Award points error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
