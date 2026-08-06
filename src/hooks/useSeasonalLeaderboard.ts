import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface SeasonalPlayer {
  user_id: string;
  display_name: string;
  gamer_tag: string | null;
  avatar_url: string | null;
  points: number;
  wins: number;
  losses: number;
  tournaments_played: number;
  rank: number;
  tier: string;
  challenges_completed: number;
}

export const useSeasons = (gameId?: string | null) => {
  return useQuery({
    queryKey: ["seasons", gameId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("seasons")
        .select("*")
        .order("start_date", { ascending: false });
      if (gameId) {
        query = query.eq("game_id", gameId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Season[];
    },
  });
};

/**
 * Seasonal standings.
 *
 * Reads through the guarded aggregate `get_season_standings`, which resolves
 * live scores vs. frozen snapshots server-side and returns ranked standings
 * only. `season_scores` / `season_snapshots` remain locked at row level.
 */
export const useSeasonalLeaderboard = (seasonId: string | null) => {
  return useQuery({
    queryKey: ["seasonal-leaderboard", seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_season_standings", {
        _season_id: seasonId!,
        _limit: 500,
      });
      if (error) throw error;

      return ((data ?? []) as any[]).map((r) => ({
        user_id: r.user_id,
        display_name: r.display_name ?? "Unknown",
        gamer_tag: r.gamer_tag ?? null,
        avatar_url: r.avatar_url ?? null,
        points: r.points ?? 0,
        wins: r.wins ?? 0,
        losses: r.losses ?? 0,
        tournaments_played: r.tournaments_played ?? 0,
        rank: r.rank ?? 0,
        tier: r.tier ?? "unranked",
        challenges_completed: r.challenges_completed ?? 0,
      })) as SeasonalPlayer[];
    },
  });
};

