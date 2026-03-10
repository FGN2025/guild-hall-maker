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

    const { winner_id, loser_id, points_winner, points_loser, game } = await req.json();
    if (!winner_id) throw new Error("winner_id required");

    // Use provided points or fall back to defaults
    const winnerPoints = typeof points_winner === "number" ? points_winner : 10;
    const loserPoints = typeof points_loser === "number" ? points_loser : 2;

    // Find the active season — try game-specific first, then fall back to global
    let season: { id: string } | null = null;

    if (game) {
      // Look up game_id from game name
      const { data: gameRow } = await supabase
        .from("games")
        .select("id")
        .eq("name", game)
        .maybeSingle();

      if (gameRow) {
        // Try game-specific season first
        const { data: gameSeason } = await supabase
          .from("seasons")
          .select("id")
          .eq("status", "active")
          .eq("game_id", gameRow.id)
          .maybeSingle();

        if (gameSeason) {
          season = gameSeason;
        }
      }
    }

    // Fall back to any active season (global or legacy)
    if (!season) {
      const { data: fallbackSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("status", "active")
        .is("game_id", null)
        .maybeSingle();
      
      // If no global season either, try any active season
      if (fallbackSeason) {
        season = fallbackSeason;
      } else {
        const { data: anySeason } = await supabase
          .from("seasons")
          .select("id")
          .eq("status", "active")
          .maybeSingle();
        season = anySeason;
      }
    }

    if (!season) {
      return new Response(
        JSON.stringify({ success: false, message: "No active season" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert winner
    const { data: existingWinner } = await supabase
      .from("season_scores")
      .select("id, points, points_available, wins")
      .eq("season_id", season.id)
      .eq("user_id", winner_id)
      .maybeSingle();

    if (existingWinner) {
      await supabase.from("season_scores").update({
        points: existingWinner.points + winnerPoints,
        points_available: (existingWinner.points_available ?? 0) + winnerPoints,
        wins: existingWinner.wins + 1,
      }).eq("id", existingWinner.id);
    } else {
      await supabase.from("season_scores").insert({
        season_id: season.id,
        user_id: winner_id,
        points: winnerPoints,
        points_available: winnerPoints,
        wins: 1,
      });
    }

    // Upsert loser
    if (loser_id && loserPoints > 0) {
      const { data: existingLoser } = await supabase
        .from("season_scores")
        .select("id, points, points_available, losses")
        .eq("season_id", season.id)
        .eq("user_id", loser_id)
        .maybeSingle();

      if (existingLoser) {
        await supabase.from("season_scores").update({
          points: existingLoser.points + loserPoints,
          points_available: (existingLoser.points_available ?? 0) + loserPoints,
          losses: existingLoser.losses + 1,
        }).eq("id", existingLoser.id);
      } else {
        await supabase.from("season_scores").insert({
          season_id: season.id,
          user_id: loser_id,
          points: loserPoints,
          points_available: loserPoints,
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
