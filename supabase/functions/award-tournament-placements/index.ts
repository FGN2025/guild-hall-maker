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
    const { tournament_id, first_id, second_id, third_id, dry_run, skip_participation, participation_only, single_award, revoke_award } = body ?? {};
    if (!tournament_id) return json({ error: "tournament_id required" }, 400);


    // Load tournament
    const { data: tournament, error: tErr } = await admin
      .from("tournaments")
      .select(
        "id, name, game, format, status, prize_type, prize_pool, prize_pct_first, prize_pct_second, prize_pct_third, points_first, points_second, points_third, points_participation, points_participation_long, points_participation_short, achievement_id",
      )
      .eq("id", tournament_id)
      .maybeSingle();
    if (tErr || !tournament) return json({ error: "Tournament not found" }, 404);

    const isGameNight = (tournament.format ?? "").toLowerCase() === "game_night";
    const parsePrizePoints = () => {
      const value = Number.parseFloat(String(tournament.prize_pool ?? "").replace(/[^0-9.]/g, ""));
      return Number.isFinite(value) && value > 0 ? value : 0;
    };
    const placementPointsFor = (place: 1 | 2 | 3) => {
      const saved =
        place === 1
          ? tournament.points_first
          : place === 2
          ? tournament.points_second
          : tournament.points_third;
      if (typeof saved === "number" && saved > 0) return saved;

      const pool = parsePrizePoints();
      if ((tournament.prize_type ?? "none") !== "value" || pool <= 0) return saved ?? 0;

      const pct =
        place === 1
          ? tournament.prize_pct_first ?? 50
          : place === 2
          ? tournament.prize_pct_second ?? 30
          : tournament.prize_pct_third ?? 20;
      return Math.round(pool * (pct / 100));
    };
    const participationPointsFor = (tier: string | null | undefined) => {
      if (!isGameNight) return tournament.points_participation ?? 0;
      if (tier === "long") return tournament.points_participation_long ?? 0;
      if (tier === "short") return tournament.points_participation_short ?? 0;
      return tournament.points_participation ?? 0;
    };

    // ── Undo a single player's award (Manage page) ──
    if (revoke_award) {
      const { user_id, scope } = revoke_award as { user_id?: string; scope?: string };
      const revokeScope = scope === "participation" || scope === "placement" ? scope : "all";
      if (!user_id) return json({ error: "revoke_award requires user_id" }, 400);


      const debitScore = async (seasonId: string, uid: string, pts: number) => {
        if (pts <= 0) return;
        const { data: existing } = await admin
          .from("season_scores")
          .select("id, points, points_available")
          .eq("season_id", seasonId)
          .eq("user_id", uid)
          .maybeSingle();
        if (!existing) return;
        await admin
          .from("season_scores")
          .update({
            points: Math.max(0, (existing.points ?? 0) - pts),
            points_available: Math.max(0, (existing.points_available ?? 0) - pts),
          })
          .eq("id", existing.id);
      };

      let removed = 0;
      let places: number[] = [];

      // Participation awards created from the Manage dropdown (season_id stored on the row).
      // Scoped to kind='participation' so bracket/match-derived awards are never removed.
      const { data: mpa } = await admin
        .from("match_point_awards")
        .select("id, points, season_id")
        .eq("tournament_id", tournament_id)
        .eq("user_id", user_id)
        .eq("kind", "participation");
      for (const row of mpa ?? []) {
        await admin.from("match_point_awards").delete().eq("id", row.id);
        if (row.season_id) await debitScore(row.season_id, user_id, row.points ?? 0);
        removed += row.points ?? 0;
      }

      // Placement awards
      const { data: pls } = await admin
        .from("tournament_placements")
        .select("id, place, points_awarded")
        .eq("tournament_id", tournament_id)
        .eq("user_id", user_id);
      if ((pls ?? []).length > 0) {
        const season = await resolveActiveSeason(admin, tournament.game);
        for (const row of pls ?? []) {
          await admin.from("tournament_placements").delete().eq("id", row.id);
          if (season) await debitScore(season.id, user_id, row.points_awarded ?? 0);
          removed += row.points_awarded ?? 0;
          places.push(row.place);
        }
      }

      if ((mpa ?? []).length === 0 && (pls ?? []).length === 0) {
        return json({ error: "No awards found for this player in this tournament." }, 404);
      }

      // Remove auto-awarded achievement if 1st place was revoked
      if (places.includes(1) && tournament.achievement_id) {
        await admin
          .from("player_achievements")
          .delete()
          .eq("user_id", user_id)
          .eq("achievement_id", tournament.achievement_id)
          .like("notes", "Auto-awarded: 1st place%");
      }

      // No awards remain for this player → clear attendance/tier flags set at award time
      await admin
        .from("tournament_registrations")
        .update({ attended: false, ...(isGameNight ? { participation_tier: null } : {}) })
        .eq("tournament_id", tournament_id)
        .eq("user_id", user_id);

      return json({ success: true, revoked: true, user_id, points_removed: removed });
    }

    // ── Single player award (per-row dropdown on the Manage page) ──
    if (single_award) {
      const { user_id, award } = single_award as { user_id?: string; award?: string };
      if (!user_id || !award) return json({ error: "single_award requires user_id and award" }, 400);

      const season = await resolveActiveSeason(admin, tournament.game);
      if (!season) return json({ error: "No active season" }, 400);

      const creditScore = async (uid: string, pts: number) => {
        if (pts <= 0) return;
        const { data: existing } = await admin
          .from("season_scores")
          .select("id, points, points_available")
          .eq("season_id", season.id)
          .eq("user_id", uid)
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
          await admin
            .from("season_scores")
            .insert({ season_id: season.id, user_id: uid, points: pts, points_available: pts });
        }
      };

      if (award === "first" || award === "second" || award === "third") {
        const place = award === "first" ? 1 : award === "second" ? 2 : 3;
        const pts = placementPointsFor(place);

        const { error: insErr } = await admin.from("tournament_placements").insert({
          tournament_id,
          place,
          user_id,
          points_awarded: pts,
          awarded_by: callerId,
        });
        if (insErr) {
          if ((insErr as any).code === "23505") {
            return json({ error: "That placement has already been awarded for this tournament." }, 409);
          }
          return json({ error: insErr.message }, 400);
        }

        await creditScore(user_id, pts);
        await admin
          .from("tournament_registrations")
          .update({ attended: true })
          .eq("tournament_id", tournament_id)
          .eq("user_id", user_id);

        if (place === 1 && tournament.achievement_id) {
          const { data: alreadyEarned } = await admin
            .from("player_achievements")
            .select("id")
            .eq("user_id", user_id)
            .eq("achievement_id", tournament.achievement_id)
            .maybeSingle();
          if (!alreadyEarned) {
            await admin.from("player_achievements").insert({
              user_id,
              achievement_id: tournament.achievement_id,
              notes: `Auto-awarded: 1st place in "${tournament.name}"`,
            });
          }
        }

        return json({ success: true, award, user_id, points: pts, season_id: season.id });
      }

      if (award === "participation" || award === "participation_long" || award === "participation_short") {
        const tier =
          award === "participation_long" ? "long" : award === "participation_short" ? "short" : null;
        if (isGameNight && !tier) {
          return json({ error: "Game Night requires long or short participation" }, 400);
        }
        const pts = participationPointsFor(tier);

        await admin
          .from("tournament_registrations")
          .update({ attended: true, ...(isGameNight ? { participation_tier: tier } : {}) })
          .eq("tournament_id", tournament_id)
          .eq("user_id", user_id);

        const { error: insErr } = await admin.from("match_point_awards").insert({
          tournament_id,
          match_id: null,
          user_id,
          kind: "participation",
          points: pts,
          season_id: season.id,
          awarded_by: callerId,
        });
        if (insErr) {
          if ((insErr as any).code === "23505") {
            return json({ error: "Participation points were already awarded to this player." }, 409);
          }
          return json({ error: insErr.message }, 400);
        }

        await creditScore(user_id, pts);
        return json({ success: true, award, user_id, points: pts, season_id: season.id });
      }

      return json({ error: `Unknown award: ${award}` }, 400);
    }



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

    if (placements.length === 0 && !participation_only) {
      return json({ success: false, message: "No placements resolved", awarded: [] });
    }

    // Resolve active season (game-specific → global → any)
    const season = await resolveActiveSeason(admin, tournament.game);
    if (!season) return json({ success: false, message: "No active season" });

    const pointsByPlace: Record<number, number> = {
      1: placementPointsFor(1),
      2: placementPointsFor(2),
      3: placementPointsFor(3),
    };

    if (dry_run) {
      const { data: dryAttendees } = await admin
        .from("tournament_registrations")
        .select("user_id, participation_tier")
        .eq("tournament_id", tournament_id)
        .eq("attended", true);

      const breakdown: Record<string, { players: number; points_each: number; total: number }> = {};
      for (const a of dryAttendees ?? []) {
        if (!a.user_id) continue;
        const key = isGameNight ? ((a as any).participation_tier ?? "standard") : "standard";
        const pts = participationPointsFor((a as any).participation_tier);
        if (!breakdown[key]) breakdown[key] = { players: 0, points_each: pts, total: 0 };
        breakdown[key].players += 1;
        breakdown[key].total += pts;
      }

      return json({
        success: true,
        dry_run: true,
        season_id: season.id,
        placements: placements.map((p) => ({
          place: p.place,
          user_id: p.user_id,
          points: pointsByPlace[p.place],
        })),
        participation_preview: {
          format: tournament.format,
          game_night: isGameNight,
          attended_count: (dryAttendees ?? []).length,
          by_tier: breakdown,
          total_points: Object.values(breakdown).reduce((s, b) => s + b.total, 0),
        },
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


    // ── Participation payout: once per attended player ──
    const participation: any[] = [];
    if (!skip_participation) {
      const { data: attendees } = await admin
        .from("tournament_registrations")
        .select("user_id, participation_tier")
        .eq("tournament_id", tournament_id)
        .eq("attended", true);

      for (const a of attendees ?? []) {
        if (!a.user_id) continue;
        const tier = isGameNight ? ((a as any).participation_tier ?? null) : null;
        const partPts = participationPointsFor((a as any).participation_tier);
        // Idempotent insert via partial unique index (kind='participation')
        const { error: insErr } = await admin
          .from("match_point_awards")
          .insert({
            tournament_id,
            match_id: null,
            user_id: a.user_id,
            kind: "participation",
            points: partPts,
            season_id: season.id,
            awarded_by: callerId,
          });

        if (insErr) {
          if ((insErr as any).code === "23505") {
            participation.push({ user_id: a.user_id, tier, points: partPts, status: "already_awarded" });
            continue;
          }
          participation.push({ user_id: a.user_id, tier, points: partPts, status: "error", error: insErr.message });
          continue;
        }

        if (partPts > 0) {
          const { data: existingScore } = await admin
            .from("season_scores")
            .select("id, points, points_available")
            .eq("season_id", season.id)
            .eq("user_id", a.user_id)
            .maybeSingle();

          if (existingScore) {
            await admin
              .from("season_scores")
              .update({
                points: (existingScore.points ?? 0) + partPts,
                points_available: (existingScore.points_available ?? 0) + partPts,
              })
              .eq("id", existingScore.id);
          } else {
            await admin.from("season_scores").insert({
              season_id: season.id,
              user_id: a.user_id,
              points: partPts,
              points_available: partPts,
            });
          }
        }

        participation.push({ user_id: a.user_id, tier, points: partPts, status: "awarded" });

      }
    }

    if (tournament.status !== "completed" && !participation_only) {
      await admin.from("tournaments").update({ status: "completed" }).eq("id", tournament_id);
    }

    return json({ success: true, awarded, skipped, participation, season_id: season.id });
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
