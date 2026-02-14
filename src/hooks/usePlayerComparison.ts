import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerComparisonData {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  gamer_tag: string | null;
  seasons: {
    season_id: string;
    season_name: string;
    points: number;
    wins: number;
    losses: number;
    tournaments_played: number;
    tier: string | null;
    rank: number | null;
  }[];
  totals: {
    points: number;
    wins: number;
    losses: number;
    tournaments_played: number;
    winRate: number;
    seasonsPlayed: number;
  };
}

export const useAllPlayers = () => {
  return useQuery({
    queryKey: ["all-players-for-comparison"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, gamer_tag, avatar_url")
        .order("display_name");
      return data ?? [];
    },
  });
};

export const usePlayerComparisonData = (userId: string | null) => {
  return useQuery({
    queryKey: ["player-comparison", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PlayerComparisonData | null> => {
      if (!userId) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, gamer_tag, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile) return null;

      // Get active season scores
      const { data: scores } = await supabase
        .from("season_scores")
        .select("season_id, points, wins, losses, tournaments_played")
        .eq("user_id", userId);

      // Get completed season snapshots
      const { data: snapshots } = await supabase
        .from("season_snapshots")
        .select("season_id, final_points, wins, losses, tier, final_rank")
        .eq("user_id", userId);

      // Get all seasons for names
      const { data: seasons } = await supabase
        .from("seasons")
        .select("id, name, status")
        .order("start_date", { ascending: true });

      const seasonMap = new Map((seasons ?? []).map((s) => [s.id, s]));

      const seasonEntries: PlayerComparisonData["seasons"] = [];

      for (const sc of scores ?? []) {
        const season = seasonMap.get(sc.season_id);
        if (season) {
          seasonEntries.push({
            season_id: sc.season_id,
            season_name: season.name,
            points: sc.points,
            wins: sc.wins,
            losses: sc.losses,
            tournaments_played: sc.tournaments_played,
            tier: null,
            rank: null,
          });
        }
      }

      for (const sn of snapshots ?? []) {
        const season = seasonMap.get(sn.season_id);
        if (season && !seasonEntries.some((e) => e.season_id === sn.season_id)) {
          seasonEntries.push({
            season_id: sn.season_id,
            season_name: season.name,
            points: sn.final_points,
            wins: sn.wins,
            losses: sn.losses,
            tournaments_played: 0,
            tier: sn.tier,
            rank: sn.final_rank,
          });
        }
      }

      const totalWins = seasonEntries.reduce((s, e) => s + e.wins, 0);
      const totalLosses = seasonEntries.reduce((s, e) => s + e.losses, 0);
      const totalMatches = totalWins + totalLosses;

      return {
        user_id: profile.user_id,
        display_name: profile.gamer_tag || profile.display_name || "Unknown",
        avatar_url: profile.avatar_url,
        gamer_tag: profile.gamer_tag,
        seasons: seasonEntries,
        totals: {
          points: seasonEntries.reduce((s, e) => s + e.points, 0),
          wins: totalWins,
          losses: totalLosses,
          tournaments_played: seasonEntries.reduce((s, e) => s + e.tournaments_played, 0),
          winRate: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0,
          seasonsPlayed: seasonEntries.length,
        },
      };
    },
  });
};
