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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth guard ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const callerRoles = (roles || []).map((r: any) => r.role);
    if (!callerRoles.includes("admin") && !callerRoles.includes("moderator")) {
      return new Response(JSON.stringify({ error: "Forbidden: admin or moderator role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Business logic ──
    const supabase = adminClient;

    const { winner_id, loser_id, points_winner, points_loser, game, achievement_id } = await req.json();
    if (!winner_id) throw new Error("winner_id required");

    const winnerPoints = typeof points_winner === "number" ? points_winner : 10;
    const loserPoints = typeof points_loser === "number" ? points_loser : 2;

    // Find the active season — try game-specific first, then fall back to global
    let season: { id: string } | null = null;

    if (game) {
      const { data: gameRow } = await supabase
        .from("games")
        .select("id")
        .eq("name", game)
        .maybeSingle();

      if (gameRow) {
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

    if (!season) {
      const { data: fallbackSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("status", "active")
        .is("game_id", null)
        .maybeSingle();
      
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

    // Auto-award linked achievement if provided
    if (achievement_id && winner_id) {
      const { data: existing } = await supabase
        .from("player_achievements")
        .select("id")
        .eq("user_id", winner_id)
        .eq("achievement_id", achievement_id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("player_achievements").insert({
          user_id: winner_id,
          achievement_id,
          notes: "Auto-awarded on completion",
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
