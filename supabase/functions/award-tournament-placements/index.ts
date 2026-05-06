import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlaceInput = { place: 1 | 2 | 3; user_id: string | null | undefined };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Invalid token" }, 401);
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const callerRoles = (roles ?? []).map((r: any) => r.role);
    if (!callerRoles.includes("admin") && !callerRoles.includes("moderator")) {
      return json({ error: "Forbidden: admin or moderator required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { tournament_id, first_id, second_id, third_id, dry_run } = body ?? {};
    if (!tournament_id) return json({ error: "tournament_id required" }, 400);

    // Load tournament
    const { data: tournament, error: tErr } = await admin
      .from("tournaments")
      .select("id, name, game, format, status, points_first, points_second, points_third, achievement_id")
      .eq("id", tournament_id)
      .maybeSingle();
    if (tErr || !tournament) return json({ error: "Tournament not found" }, 404);

    // Resolve placements: explicit args win; otherwise auto-detect for single_elimination
    let firstId = first_id ?? null;
    let secondId = second_id ?? null;
    let thirdId = third_id ?? null;

    if (!firstId || !secondId) {
      if ((tournament.format ?? "").toLowerCase().includes("single")) {
        const detected = await detectFromBracket(admin, tournament_id);
        firstId = firstId ?? detected.first;
        secondId = secondId ?? detected.second;
        thirdId = thirdId ?? detected.third;
      }
    }

    const placements: PlaceInput[] = [
      { place: 1, user_id: firstId },
      { place: 2, user_id: secondId },
      { place: 3, user_id: thirdId },
    ].filter((p) => !!p.user_id) as PlaceInput[];

    if (placements.length === 0) {
      return json({ success: false, message: "No placements resolved", awarded: [] });
    }

    // Resolve active season (game-specific → global → any)
    const season = await resolveActiveSeason(admin, tournament.game);
    if (!season) return json({ success: false, message: "No active season" });

    const pointsByPlace: Record<number, number> = {
      1: tournament.points_first ?? 10,
      2: tournament.points_second ?? 5,
      3: tournament.points_third ?? 3,
    };

    if (dry_run) {
      return json({
        success: true,
        dry_run: true,
        season_id: season.id,
        placements: placements.map((p) => ({
          place: p.place,
          user_id: p.user_id,
          points: pointsByPlace[p.place],
        })),
      });
    }

    const awarded: any[] = [];
    const skipped: any[] = [];

    for (const p of placements) {
      const pts = pointsByPlace[p.place] ?? 0;
      // Idempotent insert
      const { data: ins, error: insErr } = await admin
        .from("tournament_placements")
        .insert({
          tournament_id,
          place: p.place,
          user_id: p.user_id!,
          points_awarded: pts,
          awarded_by: callerId,
        })
        .select("id")
        .maybeSingle();

      if (insErr) {
        // Unique violation = already awarded for this place
        if ((insErr as any).code === "23505") {
          skipped.push({ place: p.place, user_id: p.user_id, reason: "already_awarded" });
          continue;
        }
        skipped.push({ place: p.place, user_id: p.user_id, reason: insErr.message });
        continue;
      }

      if (pts > 0) {
        const { data: existing } = await admin
          .from("season_scores")
          .select("id, points, points_available")
          .eq("season_id", season.id)
          .eq("user_id", p.user_id!)
          .maybeSingle();

        if (existing) {
          await admin
            .from("season_scores")
            .update({
              points: (existing.points ?? 0) + pts,
              points_available: (existing.points_available ?? 0) + pts,
            })
            .eq("id", existing.id);
        } else {
          await admin.from("season_scores").insert({
            season_id: season.id,
            user_id: p.user_id!,
            points: pts,
            points_available: pts,
          });
        }
      }

      // 1st place: auto-award linked achievement
      if (p.place === 1 && tournament.achievement_id) {
        const { data: alreadyEarned } = await admin
          .from("player_achievements")
          .select("id")
          .eq("user_id", p.user_id!)
          .eq("achievement_id", tournament.achievement_id)
          .maybeSingle();
        if (!alreadyEarned) {
          await admin.from("player_achievements").insert({
            user_id: p.user_id!,
            achievement_id: tournament.achievement_id,
            notes: `Auto-awarded: 1st place in "${tournament.name}"`,
          });
        }
      }

      awarded.push({ place: p.place, user_id: p.user_id, points: pts, id: ins?.id });
    }

    if (tournament.status !== "completed") {
      await admin.from("tournaments").update({ status: "completed" }).eq("id", tournament_id);
    }

    return json({ success: true, awarded, skipped, season_id: season.id });
  } catch (err) {
    console.error("award-tournament-placements error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveActiveSeason(admin: any, game?: string | null) {
  if (game) {
    const { data: gameRow } = await admin.from("games").select("id").eq("name", game).maybeSingle();
    if (gameRow) {
      const { data: gs } = await admin
        .from("seasons")
        .select("id")
        .eq("status", "active")
        .eq("game_id", gameRow.id)
        .maybeSingle();
      if (gs) return gs;
    }
  }
  const { data: gl } = await admin
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .is("game_id", null)
    .maybeSingle();
  if (gl) return gl;
  const { data: any1 } = await admin.from("seasons").select("id").eq("status", "active").maybeSingle();
  return any1 ?? null;
}

async function detectFromBracket(admin: any, tournament_id: string) {
  const { data: matches } = await admin
    .from("match_results")
    .select("id, round, match_number, player1_id, player2_id, winner_id, status, completed_at")
    .eq("tournament_id", tournament_id)
    .eq("status", "completed");

  const list = matches ?? [];
  if (list.length === 0) return { first: null, second: null, third: null };

  const maxRound = Math.max(...list.map((m: any) => m.round ?? 0));
  const final = list.find((m: any) => m.round === maxRound && m.winner_id);
  if (!final) return { first: null, second: null, third: null };

  const first = final.winner_id;
  const second = final.player1_id === first ? final.player2_id : final.player1_id;

  // Semifinal losers (round = maxRound - 1)
  const semis = list.filter((m: any) => m.round === maxRound - 1 && m.winner_id);
  const semiLosers = semis
    .map((m: any) => (m.player1_id === m.winner_id ? m.player2_id : m.player1_id))
    .filter(Boolean);

  // If a true 3rd-place match exists at maxRound (rare), skip; otherwise return first semi loser
  // For ties: pick the one whose semifinal completed earliest
  let third: string | null = null;
  if (semiLosers.length === 1) third = semiLosers[0];
  else if (semiLosers.length >= 2) {
    const sorted = [...semis].sort((a: any, b: any) => {
      const ta = a.completed_at ? new Date(a.completed_at).getTime() : Infinity;
      const tb = b.completed_at ? new Date(b.completed_at).getTime() : Infinity;
      return ta - tb;
    });
    const m = sorted[0];
    third = m.player1_id === m.winner_id ? m.player2_id : m.player1_id;
  }

  return { first, second, third };
}
