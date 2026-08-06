import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeasons, type Season } from "./useSeasonalLeaderboard";

export interface SeasonStatsData {
  totalPlayers: number;
  totalMatches: number;
  totalPoints: number;
  avgPointsPerMatch: number;
  topPlayers: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    points: number;
    wins: number;
    losses: number;
    tournaments_played: number;
  }[];
  tierDistribution: { tier: string; count: number }[];
  seasonProgression: {
    season_name: string;
    total_points: number;
    total_players: number;
    avg_points: number;
  }[];
}

export { useSeasons };

function emptyStats(): SeasonStatsData {
  return {
    totalPlayers: 0,
    totalMatches: 0,
    totalPoints: 0,
    avgPointsPerMatch: 0,
    topPlayers: [],
    tierDistribution: [],
    seasonProgression: [],
  };
}

/**
 * Season summary statistics.
 *
 * Reads through the guarded aggregate `get_season_stats_summary`. Only totals,
 * tier distribution and the rendered top ten cross the API boundary — never
 * the full per-player row set.
 */
export const useSeasonStats = (seasonId: string | null) => {
  return useQuery({
    queryKey: ["season-stats", seasonId],
    enabled: !!seasonId,
    queryFn: async (): Promise<SeasonStatsData> => {
      const { data, error } = await (supabase.rpc as any)("get_season_stats_summary", {
        _season_id: seasonId!,
      });
      if (error) throw error;
      const d = (data ?? {}) as any;
      return {
        ...emptyStats(),
        totalPlayers: d.totalPlayers ?? 0,
        totalMatches: d.totalMatches ?? 0,
        totalPoints: d.totalPoints ?? 0,
        avgPointsPerMatch: Number(d.avgPointsPerMatch ?? 0),
        topPlayers: (d.topPlayers ?? []).map((p: any) => ({
          user_id: p.user_id,
          display_name: p.display_name ?? "Unknown",
          avatar_url: p.avatar_url ?? null,
          points: p.points ?? 0,
          wins: p.wins ?? 0,
          losses: p.losses ?? 0,
          tournaments_played: p.tournaments_played ?? 0,
        })),
        tierDistribution: (d.tierDistribution ?? []).map((t: any) => ({
          tier: t.tier,
          count: t.count ?? 0,
        })),
      };
    },
  });
};

/** Season-over-season progression. Pure aggregate, no player identities. */
export const useSeasonProgression = () => {
  return useQuery({
    queryKey: ["season-progression"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_season_progression");
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        season_name: r.season_name,
        total_points: r.total_points ?? 0,
        total_players: r.total_players ?? 0,
        avg_points: r.avg_points ?? 0,
      }));
    },
  });
};
