import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GamePlayerStats {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  tournaments_played: number;
}

export interface GameStatsData {
  totalTournaments: number;
  totalMatches: number;
  uniquePlayers: number;
  topPlayers: GamePlayerStats[];
}

export interface GameOverviewItem {
  game_name: string;
  tournament_count: number;
  match_count: number;
}

export const useGameStats = (gameName: string | null, seasonRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ["game-stats", gameName, seasonRange?.start, seasonRange?.end],
    queryFn: async (): Promise<GameStatsData> => {
      // 1. Fetch tournaments for this game, optionally filtered by season date range
      let query = supabase
        .from("tournaments")
        .select("id")
        .eq("game", gameName!);
      
      if (seasonRange) {
        query = query.gte("start_date", seasonRange.start).lte("start_date", seasonRange.end);
      }

      const { data: tournaments, error: tErr } = await query;
      if (tErr) throw tErr;
      if (!tournaments || tournaments.length === 0) {
        return { totalTournaments: 0, totalMatches: 0, uniquePlayers: 0, topPlayers: [] };
      }

      const tournamentIds = tournaments.map((t) => t.id);

      // 2. Fetch match results for those tournaments
      const { data: matches, error: mErr } = await supabase
        .from("match_results")
        .select("player1_id, player2_id, winner_id, tournament_id, status")
        .in("tournament_id", tournamentIds);
      if (mErr) throw mErr;

      // 3. Aggregate per-player stats
      const playerMap = new Map<string, { wins: number; losses: number; matches: number; tournamentSet: Set<string> }>();
      const completedMatches = (matches ?? []).filter((m) => m.status === "completed");

      for (const m of completedMatches) {
        for (const pid of [m.player1_id, m.player2_id]) {
          if (!pid) continue;
          if (!playerMap.has(pid)) {
            playerMap.set(pid, { wins: 0, losses: 0, matches: 0, tournamentSet: new Set() });
          }
          const ps = playerMap.get(pid)!;
          ps.matches++;
          ps.tournamentSet.add(m.tournament_id);
          if (m.winner_id === pid) ps.wins++;
          else ps.losses++;
        }
      }

      // 4. Fetch profiles for players
      const playerIds = Array.from(playerMap.keys());
      let profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
      if (playerIds.length > 0) {
        const { data: profiles } = await (supabase.from as any)("profiles_public")
          .select("user_id, display_name, avatar_url")
          .in("user_id", playerIds);
        for (const p of profiles ?? []) {
          profileMap.set(p.user_id, { display_name: p.display_name ?? "Unknown", avatar_url: p.avatar_url });
        }
      }

      // 5. Build top players list sorted by wins desc
      const topPlayers: GamePlayerStats[] = Array.from(playerMap.entries())
        .map(([uid, s]) => {
          const profile = profileMap.get(uid);
          const total = s.wins + s.losses;
          return {
            user_id: uid,
            display_name: profile?.display_name ?? "Unknown",
            avatar_url: profile?.avatar_url ?? null,
            matches: s.matches,
            wins: s.wins,
            losses: s.losses,
            win_rate: total > 0 ? Math.round((s.wins / total) * 100) : 0,
            tournaments_played: s.tournamentSet.size,
          };
        })
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 20);

      return {
        totalTournaments: tournaments.length,
        totalMatches: completedMatches.length,
        uniquePlayers: playerMap.size,
        topPlayers,
      };
    },
    enabled: !!gameName,
  });
};

export const useGameStatsOverview = () => {
  return useQuery({
    queryKey: ["game-stats-overview"],
    queryFn: async (): Promise<GameOverviewItem[]> => {
      const { data: tournaments, error } = await supabase
        .from("tournaments")
        .select("id, game");
      if (error) throw error;

      // Group by game name
      const gameMap = new Map<string, { tournament_ids: Set<string> }>();
      for (const t of tournaments ?? []) {
        if (!gameMap.has(t.game)) gameMap.set(t.game, { tournament_ids: new Set() });
        gameMap.get(t.game)!.tournament_ids.add(t.id);
      }

      // Fetch match counts per tournament
      const allTournamentIds = (tournaments ?? []).map((t) => t.id);
      let matchCountMap = new Map<string, number>();
      if (allTournamentIds.length > 0) {
        const { data: matches } = await supabase
          .from("match_results")
          .select("tournament_id")
          .in("tournament_id", allTournamentIds)
          .eq("status", "completed");
        for (const m of matches ?? []) {
          matchCountMap.set(m.tournament_id, (matchCountMap.get(m.tournament_id) ?? 0) + 1);
        }
      }

      return Array.from(gameMap.entries())
        .map(([game_name, info]) => {
          let match_count = 0;
          for (const tid of info.tournament_ids) {
            match_count += matchCountMap.get(tid) ?? 0;
          }
          return { game_name, tournament_count: info.tournament_ids.size, match_count };
        })
        .sort((a, b) => b.tournament_count - a.tournament_count);
    },
  });
};
