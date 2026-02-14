import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardPlayer {
  user_id: string;
  display_name: string;
  gamer_tag: string | null;
  avatar_url: string | null;
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  win_rate: number;
  rank: number;
}

export interface LeaderboardFilters {
  game: string;
  tournamentId: string;
  timePeriod: string;
}

export const useLeaderboard = (filters: LeaderboardFilters) => {
  const queryClient = useQueryClient();

  // Subscribe to realtime match_results changes to auto-refresh rankings
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_results" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard", filters] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, filters]);

  return useQuery({
    queryKey: ["leaderboard", filters],
    queryFn: async () => {
      // Build match query with filters
      let matchQuery = supabase
        .from("match_results")
        .select("player1_id, player2_id, winner_id, status, tournament_id, completed_at")
        .eq("status", "completed");

      // Time period filter
      if (filters.timePeriod && filters.timePeriod !== "all") {
        const now = new Date();
        let since: Date;
        switch (filters.timePeriod) {
          case "7d":
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "90d":
            since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            since = new Date(0);
        }
        matchQuery = matchQuery.gte("completed_at", since.toISOString());
      }

      // Tournament filter
      if (filters.tournamentId && filters.tournamentId !== "all") {
        matchQuery = matchQuery.eq("tournament_id", filters.tournamentId);
      }

      const { data: matches, error: matchError } = await matchQuery;
      if (matchError) throw matchError;
      if (!matches || matches.length === 0) return [] as LeaderboardPlayer[];

      // If game filter is active, fetch tournament IDs for that game
      let validTournamentIds: Set<string> | null = null;
      if (filters.game && filters.game !== "all") {
        const { data: tournaments } = await supabase
          .from("tournaments")
          .select("id")
          .eq("game", filters.game);
        validTournamentIds = new Set((tournaments ?? []).map((t) => t.id));
      }

      // Aggregate stats per player
      const stats: Record<string, { wins: number; losses: number; draws: number }> = {};

      const ensurePlayer = (id: string) => {
        if (!stats[id]) stats[id] = { wins: 0, losses: 0, draws: 0 };
      };

      matches.forEach((m) => {
        // Skip if game filter active and tournament not matching
        if (validTournamentIds && !validTournamentIds.has(m.tournament_id)) return;

        const p1 = m.player1_id;
        const p2 = m.player2_id;
        if (!p1 && !p2) return;

        if (p1) ensurePlayer(p1);
        if (p2) ensurePlayer(p2);

        if (!m.winner_id) {
          if (p1) stats[p1].draws++;
          if (p2) stats[p2].draws++;
        } else {
          stats[m.winner_id].wins++;
          const loserId = m.winner_id === p1 ? p2 : p1;
          if (loserId) stats[loserId].losses++;
        }
      });

      // Fetch profiles for all players
      const playerIds = Object.keys(stats);
      const { data: profiles } = playerIds.length > 0
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, gamer_tag, avatar_url")
            .in("user_id", playerIds)
        : { data: [] };

      // Build leaderboard
      const leaderboard: LeaderboardPlayer[] = playerIds.map((uid) => {
        const s = stats[uid];
        const profile = (profiles ?? []).find((p) => p.user_id === uid);
        const total = s.wins + s.losses + s.draws;

        return {
          user_id: uid,
          display_name: profile?.gamer_tag || profile?.display_name || "Unknown",
          gamer_tag: profile?.gamer_tag ?? null,
          avatar_url: profile?.avatar_url ?? null,
          wins: s.wins,
          losses: s.losses,
          draws: s.draws,
          total_matches: total,
          win_rate: total > 0 ? Math.round((s.wins / total) * 100) : 0,
          rank: 0,
        };
      });

      leaderboard.sort((a, b) => {
        if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });

      leaderboard.forEach((p, i) => {
        p.rank = i + 1;
      });

      return leaderboard;
    },
  });
};

export const useLeaderboardFilterOptions = () => {
  const gamesQuery = useQuery({
    queryKey: ["leaderboard-games"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("game")
        .order("game");
      const unique = [...new Set((data ?? []).map((t) => t.game))];
      return unique;
    },
  });

  const tournamentsQuery = useQuery({
    queryKey: ["leaderboard-tournaments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name")
        .order("name");
      return data ?? [];
    },
  });

  return { games: gamesQuery.data ?? [], tournaments: tournamentsQuery.data ?? [] };
};
