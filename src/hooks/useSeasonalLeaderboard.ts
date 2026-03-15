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

export const useSeasonalLeaderboard = (seasonId: string | null) => {
  return useQuery({
    queryKey: ["seasonal-leaderboard", seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      // Check if this is a completed season (use snapshots) or active (use scores)
      const { data: season } = await supabase
        .from("seasons")
        .select("status")
        .eq("id", seasonId!)
        .maybeSingle();

      if (!season) return [] as SeasonalPlayer[];

      if (season.status === "completed") {
        // Use frozen snapshots
        const { data: snapshots, error } = await supabase
          .from("season_snapshots")
          .select("*")
          .eq("season_id", seasonId!)
          .order("final_rank", { ascending: true });
        if (error) throw error;

        const userIds = (snapshots ?? []).map((s) => s.user_id);
        const { data: profiles } = userIds.length > 0
          ? await (supabase.from as any)("profiles_public").select("user_id, display_name, gamer_tag, avatar_url").in("user_id", userIds)
          : { data: [] };

        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

        return (snapshots ?? []).map((s) => {
          const profile = profileMap.get(s.user_id);
          return {
            user_id: s.user_id,
            display_name: profile?.gamer_tag || profile?.display_name || "Unknown",
            gamer_tag: profile?.gamer_tag ?? null,
            avatar_url: profile?.avatar_url ?? null,
            points: s.final_points,
            wins: s.wins,
            losses: s.losses,
            tournaments_played: 0,
            rank: s.final_rank,
            tier: s.tier,
          } as SeasonalPlayer;
        });
      } else {
        // Active season — use live scores
        const { data: scores, error } = await supabase
          .from("season_scores")
          .select("*")
          .eq("season_id", seasonId!)
          .order("points", { ascending: false });
        if (error) throw error;

        const userIds = (scores ?? []).map((s) => s.user_id);
        const { data: profiles } = userIds.length > 0
          ? await (supabase.from as any)("profiles_public").select("user_id, display_name, gamer_tag, avatar_url").in("user_id", userIds)
          : { data: [] };

        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        const total = (scores ?? []).length;

        return (scores ?? []).map((s, i) => {
          const profile = profileMap.get(s.user_id);
          const rank = i + 1;
          const percentile = total > 0 ? rank / total : 1;
          let tier = "none";
          if (percentile <= 0.05) tier = "platinum";
          else if (percentile <= 0.15) tier = "gold";
          else if (percentile <= 0.35) tier = "silver";
          else if (percentile <= 0.60) tier = "bronze";

          return {
            user_id: s.user_id,
            display_name: profile?.gamer_tag || profile?.display_name || "Unknown",
            gamer_tag: profile?.gamer_tag ?? null,
            avatar_url: profile?.avatar_url ?? null,
            points: s.points,
            wins: s.wins,
            losses: s.losses,
            tournaments_played: s.tournaments_played,
            rank,
            tier,
          } as SeasonalPlayer;
        });
      }
    },
  });
};
