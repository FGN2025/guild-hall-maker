import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MyGameStats {
  game_name: string;
  category: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  avg_score_margin: number;
  tournaments_played: number;
}

export interface MySeasonStats {
  season_id: string;
  season_name: string;
  status: string;
  points: number;
  wins: number;
  losses: number;
  tournaments_played: number;
  tier: string | null;
  rank: number | null;
}

export interface MyStatsData {
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalMatches: number;
  winRate: number;
  tournamentsPlayed: number;
  totalPoints: number;
  gameBreakdown: MyGameStats[];
  seasonBreakdown: MySeasonStats[];
}

export const useMyStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["my-stats", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyStatsData> => {
      // Fetch matches, tournaments, games, season_scores, season_snapshots in parallel
      const [matchesRes, tournamentsRes, gamesRes, scoresRes, snapshotsRes, seasonsRes] = await Promise.all([
        supabase
          .from("match_results")
          .select("player1_id, player2_id, winner_id, player1_score, player2_score, tournament_id, status")
          .eq("status", "completed")
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`),
        supabase.from("tournaments").select("id, game"),
        supabase.from("games").select("name, category").eq("is_active", true),
        supabase.from("season_scores").select("season_id, points, wins, losses, tournaments_played, points_available").eq("user_id", userId!),
        supabase.from("season_snapshots").select("season_id, final_points, final_rank, tier, wins, losses").eq("user_id", userId!),
        supabase.from("seasons").select("id, name, status").order("start_date", { ascending: false }),
      ]);

      const matches = matchesRes.data ?? [];
      const tournaments = tournamentsRes.data ?? [];
      const games = gamesRes.data ?? [];
      const scores = scoresRes.data ?? [];
      const snapshots = snapshotsRes.data ?? [];
      const seasons = seasonsRes.data ?? [];

      // Map tournament_id -> game name
      const tournamentGameMap = new Map(tournaments.map((t) => [t.id, t.game]));
      // Map game name -> category
      const gameCategoryMap = new Map(games.map((g) => [g.name, g.category]));

      // Aggregate per-game stats
      const gameMap = new Map<string, { wins: number; losses: number; draws: number; matches: number; scoreMargins: number[]; tournamentSet: Set<string> }>();

      let totalWins = 0, totalLosses = 0, totalDraws = 0;
      const allTournamentIds = new Set<string>();

      for (const m of matches) {
        const isPlayer1 = m.player1_id === userId;
        const gameName = tournamentGameMap.get(m.tournament_id) ?? "Unknown";
        
        if (!gameMap.has(gameName)) {
          gameMap.set(gameName, { wins: 0, losses: 0, draws: 0, matches: 0, scoreMargins: [], tournamentSet: new Set() });
        }
        const gs = gameMap.get(gameName)!;
        gs.matches++;
        gs.tournamentSet.add(m.tournament_id);
        allTournamentIds.add(m.tournament_id);

        if (!m.winner_id) {
          gs.draws++;
          totalDraws++;
        } else if (m.winner_id === userId) {
          gs.wins++;
          totalWins++;
        } else {
          gs.losses++;
          totalLosses++;
        }

        // Score margin
        const playerScore = isPlayer1 ? m.player1_score : m.player2_score;
        const opponentScore = isPlayer1 ? m.player2_score : m.player1_score;
        if (playerScore != null && opponentScore != null) {
          gs.scoreMargins.push(playerScore - opponentScore);
        }
      }

      const totalMatches = totalWins + totalLosses + totalDraws;

      const gameBreakdown: MyGameStats[] = Array.from(gameMap.entries())
        .map(([game_name, s]) => {
          const total = s.wins + s.losses + s.draws;
          const avgMargin = s.scoreMargins.length > 0
            ? s.scoreMargins.reduce((a, b) => a + b, 0) / s.scoreMargins.length
            : 0;
          return {
            game_name,
            category: gameCategoryMap.get(game_name) ?? "General",
            matches: s.matches,
            wins: s.wins,
            losses: s.losses,
            draws: s.draws,
            win_rate: total > 0 ? Math.round((s.wins / total) * 100) : 0,
            avg_score_margin: Math.round(avgMargin * 10) / 10,
            tournaments_played: s.tournamentSet.size,
          };
        })
        .sort((a, b) => b.matches - a.matches);

      // Season breakdown
      const snapshotMap = new Map(snapshots.map((s) => [s.season_id, s]));
      const scoreMap = new Map(scores.map((s) => [s.season_id, s]));
      
      let totalPoints = 0;
      const seasonBreakdown: MySeasonStats[] = seasons
        .filter((s) => scoreMap.has(s.id) || snapshotMap.has(s.id))
        .map((s) => {
          const score = scoreMap.get(s.id);
          const snap = snapshotMap.get(s.id);
          const pts = snap?.final_points ?? score?.points ?? 0;
          totalPoints += pts;
          return {
            season_id: s.id,
            season_name: s.name,
            status: s.status,
            points: pts,
            wins: snap?.wins ?? score?.wins ?? 0,
            losses: snap?.losses ?? score?.losses ?? 0,
            tournaments_played: score?.tournaments_played ?? 0,
            tier: snap?.tier ?? null,
            rank: snap?.final_rank ?? null,
          };
        });

      return {
        totalWins,
        totalLosses,
        totalDraws,
        totalMatches,
        winRate: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0,
        tournamentsPlayed: allTournamentIds.size,
        totalPoints,
        gameBreakdown,
        seasonBreakdown,
      };
    },
  });
};
