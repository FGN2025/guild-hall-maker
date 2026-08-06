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
  points: number;
  rank: number;
  challenges_completed: number;
  tier: string;
}

/**
 * All-time standings.
 *
 * Reads through the guarded aggregate `get_leaderboard_standings` instead of
 * selecting `season_scores` directly. The underlying tables stay locked to
 * self / same-tenant / platform staff; the function returns ranked standings
 * only (rank, public display identity, score) and refuses anonymous callers.
 */
export const useLeaderboard = () => {
  return useQuery({
    queryKey: ["leaderboard-alltime"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_leaderboard_standings", {
        _limit: 500,
      });
      if (error) throw error;

      return ((data ?? []) as any[]).map((r) => ({
        user_id: r.user_id,
        display_name: r.display_name ?? "Unknown",
        gamer_tag: r.gamer_tag ?? null,
        avatar_url: r.avatar_url ?? null,
        wins: r.wins ?? 0,
        losses: r.losses ?? 0,
        draws: 0,
        total_matches: r.tournaments_played ?? 0,
        win_rate: r.win_rate ?? 0,
        points: r.points ?? 0,
        rank: r.rank ?? 0,
        challenges_completed: r.challenges_completed ?? 0,
        tier: r.tier ?? "unranked",
      })) as LeaderboardPlayer[];
    },
  });
};
