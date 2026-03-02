import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GameBenchmark {
  game_name: string;
  category: string;
  top10WinRate: number;
  top10AvgMargin: number;
  playerWinRate: number;
  playerAvgMargin: number;
  playerMatches: number;
  isStrength: boolean;
  gap: number; // positive = player above, negative = below
  tip: string;
}

export interface GenreInsight {
  category: string;
  avgWinRate: number;
  gamesPlayed: number;
  label: "strength" | "average" | "improve";
}

export interface SkillInsightsData {
  gameInsights: GameBenchmark[];
  genreInsights: GenreInsight[];
}

export const useSkillInsights = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["skill-insights", userId],
    enabled: !!userId,
    queryFn: async (): Promise<SkillInsightsData> => {
      // Fetch all completed matches and tournaments
      const [matchesRes, tournamentsRes, gamesRes] = await Promise.all([
        supabase
          .from("match_results")
          .select("player1_id, player2_id, winner_id, player1_score, player2_score, tournament_id, status")
          .eq("status", "completed"),
        supabase.from("tournaments").select("id, game"),
        supabase.from("games").select("name, category").eq("is_active", true),
      ]);

      const matches = matchesRes.data ?? [];
      const tournaments = tournamentsRes.data ?? [];
      const games = gamesRes.data ?? [];

      const tournamentGameMap = new Map(tournaments.map((t) => [t.id, t.game]));
      const gameCategoryMap = new Map(games.map((g) => [g.name, g.category]));

      // Aggregate all players' stats per game
      type PlayerGameStat = { wins: number; losses: number; matches: number; scoreMargins: number[] };
      const allStats = new Map<string, Map<string, PlayerGameStat>>(); // game -> playerId -> stats

      for (const m of matches) {
        const gameName = tournamentGameMap.get(m.tournament_id);
        if (!gameName) continue;

        if (!allStats.has(gameName)) allStats.set(gameName, new Map());
        const gameStats = allStats.get(gameName)!;

        for (const pid of [m.player1_id, m.player2_id]) {
          if (!pid) continue;
          if (!gameStats.has(pid)) gameStats.set(pid, { wins: 0, losses: 0, matches: 0, scoreMargins: [] });
          const ps = gameStats.get(pid)!;
          ps.matches++;
          const isP1 = m.player1_id === pid;
          if (m.winner_id === pid) ps.wins++;
          else if (m.winner_id) ps.losses++;

          const pScore = isP1 ? m.player1_score : m.player2_score;
          const oScore = isP1 ? m.player2_score : m.player1_score;
          if (pScore != null && oScore != null) ps.scoreMargins.push(pScore - oScore);
        }
      }

      // Build benchmarks for games the player has participated in
      const gameInsights: GameBenchmark[] = [];

      for (const [gameName, playerStats] of allStats) {
        const playerStat = playerStats.get(userId!);
        if (!playerStat || playerStat.matches < 1) continue;

        // Calculate top 10% benchmark
        const allPlayers = Array.from(playerStats.values()).filter((p) => p.matches >= 2);
        if (allPlayers.length === 0) continue;

        const winRates = allPlayers
          .map((p) => (p.matches > 0 ? (p.wins / p.matches) * 100 : 0))
          .sort((a, b) => b - a);
        const topCutoff = Math.max(1, Math.ceil(allPlayers.length * 0.1));
        const top10WinRate = Math.round(winRates.slice(0, topCutoff).reduce((a, b) => a + b, 0) / topCutoff);

        const margins = allPlayers
          .filter((p) => p.scoreMargins.length > 0)
          .map((p) => p.scoreMargins.reduce((a, b) => a + b, 0) / p.scoreMargins.length)
          .sort((a, b) => b - a);
        const top10AvgMargin = margins.length > 0
          ? Math.round(margins.slice(0, Math.max(1, Math.ceil(margins.length * 0.1))).reduce((a, b) => a + b, 0) / Math.max(1, Math.ceil(margins.length * 0.1)) * 10) / 10
          : 0;

        const playerWinRate = playerStat.matches > 0 ? Math.round((playerStat.wins / playerStat.matches) * 100) : 0;
        const playerAvgMargin = playerStat.scoreMargins.length > 0
          ? Math.round(playerStat.scoreMargins.reduce((a, b) => a + b, 0) / playerStat.scoreMargins.length * 10) / 10
          : 0;

        const gap = playerWinRate - top10WinRate;
        const isStrength = gap >= -5;
        const category = gameCategoryMap.get(gameName) ?? "General";

        let tip = "";
        if (isStrength) {
          tip = `You're performing at top-tier level in ${gameName}! Keep it up.`;
        } else if (gap > -20) {
          tip = `Your win rate in ${gameName} is ${playerWinRate}% vs top players at ${top10WinRate}%. You're close — focus on consistency.`;
        } else {
          tip = `Your win rate in ${gameName} is ${playerWinRate}% vs top players at ${top10WinRate}%. Consider studying top player strategies and practicing more.`;
        }

        gameInsights.push({
          game_name: gameName,
          category,
          top10WinRate,
          top10AvgMargin,
          playerWinRate,
          playerAvgMargin,
          playerMatches: playerStat.matches,
          isStrength,
          gap,
          tip,
        });
      }

      gameInsights.sort((a, b) => b.playerMatches - a.playerMatches);

      // Genre-level aggregation
      const genreMap = new Map<string, { totalWinRate: number; count: number }>();
      for (const gi of gameInsights) {
        if (!genreMap.has(gi.category)) genreMap.set(gi.category, { totalWinRate: 0, count: 0 });
        const g = genreMap.get(gi.category)!;
        g.totalWinRate += gi.playerWinRate;
        g.count++;
      }

      const genreInsights: GenreInsight[] = Array.from(genreMap.entries())
        .map(([category, data]) => {
          const avgWinRate = Math.round(data.totalWinRate / data.count);
          return {
            category,
            avgWinRate,
            gamesPlayed: data.count,
            label: avgWinRate >= 60 ? "strength" as const : avgWinRate >= 40 ? "average" as const : "improve" as const,
          };
        })
        .sort((a, b) => b.avgWinRate - a.avgWinRate);

      return { gameInsights, genreInsights };
    },
  });
};
