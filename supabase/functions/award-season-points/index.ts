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

    const { winner_id, loser_id } = await req.json();
    if (!winner_id) throw new Error("winner_id required");

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

    // Upsert winner: +10 points, +1 win
    const { data: existingWinner } = await supabase
      .from("season_scores")
      .select("id, points, wins")
      .eq("season_id", season.id)
      .eq("user_id", winner_id)
      .maybeSingle();

    if (existingWinner) {
      await supabase.from("season_scores").update({
        points: existingWinner.points + 10,
        wins: existingWinner.wins + 1,
      }).eq("id", existingWinner.id);
    } else {
      await supabase.from("season_scores").insert({
        season_id: season.id,
        user_id: winner_id,
        points: 10,
        wins: 1,
      });
    }

    // Upsert loser: +2 points (participation), +1 loss
    if (loser_id) {
      const { data: existingLoser } = await supabase
        .from("season_scores")
        .select("id, points, losses")
        .eq("season_id", season.id)
        .eq("user_id", loser_id)
        .maybeSingle();

      if (existingLoser) {
        await supabase.from("season_scores").update({
          points: existingLoser.points + 2,
          losses: existingLoser.losses + 1,
        }).eq("id", existingLoser.id);
      } else {
        await supabase.from("season_scores").insert({
          season_id: season.id,
          user_id: loser_id,
          points: 2,
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
