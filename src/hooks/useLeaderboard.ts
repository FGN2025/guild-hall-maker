import { useQuery } from "@tanstack/react-query";
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

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      // Fetch all completed matches
      const { data: matches, error: matchError } = await supabase
        .from("match_results")
        .select("player1_id, player2_id, winner_id, status")
        .eq("status", "completed");

      if (matchError) throw matchError;
      if (!matches || matches.length === 0) return [] as LeaderboardPlayer[];

      // Aggregate stats per player
      const stats: Record<string, { wins: number; losses: number; draws: number }> = {};

      const ensurePlayer = (id: string) => {
        if (!stats[id]) stats[id] = { wins: 0, losses: 0, draws: 0 };
      };

      matches.forEach((m) => {
        const p1 = m.player1_id;
        const p2 = m.player2_id;
        if (!p1 && !p2) return;

        if (p1) ensurePlayer(p1);
        if (p2) ensurePlayer(p2);

        if (!m.winner_id) {
          // Draw
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

      // Sort by win rate (desc), then total wins (desc), then fewer losses
      leaderboard.sort((a, b) => {
        if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });

      // Assign ranks
      leaderboard.forEach((p, i) => {
        p.rank = i + 1;
      });

      return leaderboard;
    },
  });
};
