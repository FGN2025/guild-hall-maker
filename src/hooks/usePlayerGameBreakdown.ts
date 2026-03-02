import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerGameBreakdownItem {
  game_name: string;
  category: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  tournaments_played: number;
}

export const usePlayerGameBreakdown = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["player-game-breakdown", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PlayerGameBreakdownItem[]> => {
      const [matchesRes, tournamentsRes, gamesRes] = await Promise.all([
        supabase
          .from("match_results")
          .select("player1_id, player2_id, winner_id, tournament_id, status")
          .eq("status", "completed")
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`),
        supabase.from("tournaments").select("id, game"),
        supabase.from("games").select("name, category").eq("is_active", true),
      ]);

      const matches = matchesRes.data ?? [];
      const tournaments = tournamentsRes.data ?? [];
      const games = gamesRes.data ?? [];

      const tournamentGameMap = new Map(tournaments.map((t) => [t.id, t.game]));
      const gameCategoryMap = new Map(games.map((g) => [g.name, g.category]));

      const gameMap = new Map<string, { wins: number; losses: number; draws: number; matches: number; tournamentSet: Set<string> }>();

      for (const m of matches) {
        const gameName = tournamentGameMap.get(m.tournament_id) ?? "Unknown";
        if (!gameMap.has(gameName)) {
          gameMap.set(gameName, { wins: 0, losses: 0, draws: 0, matches: 0, tournamentSet: new Set() });
        }
        const gs = gameMap.get(gameName)!;
        gs.matches++;
        gs.tournamentSet.add(m.tournament_id);

        if (!m.winner_id) gs.draws++;
        else if (m.winner_id === userId) gs.wins++;
        else gs.losses++;
      }

      return Array.from(gameMap.entries())
        .map(([game_name, s]) => {
          const total = s.wins + s.losses + s.draws;
          return {
            game_name,
            category: gameCategoryMap.get(game_name) ?? "General",
            matches: s.matches,
            wins: s.wins,
            losses: s.losses,
            draws: s.draws,
            win_rate: total > 0 ? Math.round((s.wins / total) * 100) : 0,
            tournaments_played: s.tournamentSet.size,
          };
        })
        .sort((a, b) => b.matches - a.matches);
    },
  });
};
