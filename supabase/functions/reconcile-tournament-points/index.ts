import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function resolveActiveSeason(admin: any, game?: string | null) {
  if (game) {
    const { data: gameRow } = await admin.from("games").select("id").eq("name", game).maybeSingle();
    if (gameRow) {
      const { data: gs } = await admin
        .from("seasons").select("id").eq("status", "active").eq("game_id", gameRow.id).maybeSingle();
      if (gs) return gs;
    }
  }
  const { data: gl } = await admin
    .from("seasons").select("id").eq("status", "active").is("game_id", null).maybeSingle();
  if (gl) return gl;
  const { data: any1 } = await admin.from("seasons").select("id").eq("status", "active").maybeSingle();
  return any1 ?? null;
}

async function detectFromBracket(admin: any, tournament_id: string) {
  const { data: matches } = await admin
    .from("match_results")
    .select("id, round, player1_id, player2_id, winner_id, status, completed_at")
    .eq("tournament_id", tournament_id)
    .eq("status", "completed");
  const list = matches ?? [];
  if (list.length === 0) return { first: null, second: null, third: null };
  const maxRound = Math.max(...list.map((m: any) => m.round ?? 0));
  const final = list.find((m: any) => m.round === maxRound && m.winner_id);
  if (!final) return { first: null, second: null, third: null };
  const first = final.winner_id;
  const second = final.player1_id === first ? final.player2_id : final.player1_id;
  const semis = list.filter((m: any) => m.round === maxRound - 1 && m.winner_id);
  let third: string | null = null;
  if (semis.length >= 1) {
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

async function creditSeasonScore(
  admin: any,
  season_id: string,
  user_id: string,
  pts: number,
  opts: { win?: boolean; loss?: boolean; tournament_played?: boolean } = {},
) {
  const { data: existing } = await admin
    .from("season_scores")
    .select("id, points, points_available, wins, losses, tournaments_played")
    .eq("season_id", season_id)
    .eq("user_id", user_id)
    .maybeSingle();
  if (existing) {
    await admin.from("season_scores").update({
      points: (existing.points ?? 0) + pts,
      points_available: (existing.points_available ?? 0) + pts,
      wins: (existing.wins ?? 0) + (opts.win ? 1 : 0),
      losses: (existing.losses ?? 0) + (opts.loss ? 1 : 0),
      tournaments_played: (existing.tournaments_played ?? 0) + (opts.tournament_played ? 1 : 0),
    }).eq("id", existing.id);
  } else {
    await admin.from("season_scores").insert({
      season_id, user_id,
      points: pts,
      points_available: pts,
      wins: opts.win ? 1 : 0,
      losses: opts.loss ? 1 : 0,
      tournaments_played: opts.tournament_played ? 1 : 0,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);
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
    if (!callerRoles.includes("admin")) return json({ error: "Forbidden: admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body?.dry_run !== false; // default true

    const report = {
      dry_run: dryRun,
      placements: [] as any[],
      match_credits: [] as any[],
      season_score_updates: [] as any[],
      errors: [] as any[],
    };

    // ── A. Backfill placements for every completed tournament missing them ──
    const { data: completedTourns } = await admin
      .from("tournaments")
      .select("id, name, game, format, status, points_first, points_second, points_third, achievement_id")
      .eq("status", "completed");

    for (const t of completedTourns ?? []) {
      const { count: existingPlacements } = await admin
        .from("tournament_placements")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", t.id);
      if ((existingPlacements ?? 0) > 0) continue;

      const detected = await detectFromBracket(admin, t.id);
      const items: { place: 1 | 2 | 3; user_id: string | null; pts: number }[] = [
        { place: 1, user_id: detected.first, pts: t.points_first ?? 0 },
        { place: 2, user_id: detected.second, pts: t.points_second ?? 0 },
        { place: 3, user_id: detected.third, pts: t.points_third ?? 0 },
      ].filter((i) => !!i.user_id) as any;

      if (items.length === 0) {
        report.placements.push({ tournament_id: t.id, name: t.name, status: "no_bracket_detected" });
        continue;
      }

      const season = await resolveActiveSeason(admin, t.game);
      if (!season) {
        report.placements.push({ tournament_id: t.id, name: t.name, status: "no_active_season" });
        continue;
      }

      for (const it of items) {
        report.placements.push({
          tournament_id: t.id, name: t.name, place: it.place,
          user_id: it.user_id, points: it.pts, season_id: season.id,
        });
        if (!dryRun) {
          const { error: insErr } = await admin.from("tournament_placements").insert({
            tournament_id: t.id, place: it.place, user_id: it.user_id!,
            points_awarded: it.pts, awarded_by: callerId,
          });
          if (insErr && (insErr as any).code !== "23505") {
            report.errors.push({ where: "placements", tournament_id: t.id, error: insErr.message });
            continue;
          }
          if (it.pts > 0) {
            await creditSeasonScore(admin, season.id, it.user_id!, it.pts, { tournament_played: true });
          }
        }
      }
    }

    // ── B. Backfill match participation/win/loss credits ──
    const { data: completedMatches } = await admin
      .from("match_results")
      .select("id, tournament_id, player1_id, player2_id, winner_id, status, completed_at, tournaments!inner(id, name, game, points_participation)")
      .eq("status", "completed");

    for (const m of completedMatches ?? []) {
      const t = (m as any).tournaments;
      const partPts = t?.points_participation ?? 0;
      const players: { user_id: string; kind: "win" | "loss" | "participation" }[] = [];
      if (m.player1_id) players.push({ user_id: m.player1_id, kind: m.winner_id === m.player1_id ? "win" : (m.winner_id ? "loss" : "participation") });
      if (m.player2_id) players.push({ user_id: m.player2_id, kind: m.winner_id === m.player2_id ? "win" : (m.winner_id ? "loss" : "participation") });

      if (players.length === 0) continue;

      const season = await resolveActiveSeason(admin, t?.game);

      for (const p of players) {
        const { data: existing } = await admin
          .from("match_point_awards")
          .select("id")
          .eq("match_id", m.id)
          .eq("user_id", p.user_id)
          .eq("kind", p.kind)
          .maybeSingle();
        if (existing) continue;

        report.match_credits.push({
          match_id: m.id, tournament_id: m.tournament_id, tournament_name: t?.name,
          user_id: p.user_id, kind: p.kind, points: partPts, season_id: season?.id ?? null,
        });

        if (!dryRun) {
          const { error: insErr } = await admin.from("match_point_awards").insert({
            match_id: m.id, tournament_id: m.tournament_id,
            user_id: p.user_id, kind: p.kind, points: partPts,
            season_id: season?.id ?? null, awarded_by: callerId,
          });
          if (insErr && (insErr as any).code !== "23505") {
            report.errors.push({ where: "match_credits", match_id: m.id, error: insErr.message });
            continue;
          }
          if (partPts > 0 && season) {
            await creditSeasonScore(admin, season.id, p.user_id, partPts, {
              win: p.kind === "win",
              loss: p.kind === "loss",
            });
          }
        }
      }
    }

    return json({ success: true, ...report });
  } catch (err) {
    console.error("reconcile-tournament-points error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
