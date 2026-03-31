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

const TIER_PRIORITY = ["Champion", "Epic", "Platinum", "Gold", "Silver", "Bronze"];

function deriveTier(challengeNames: string[]): string {
  for (const keyword of TIER_PRIORITY) {
    if (challengeNames.some((n) => n.includes(keyword))) {
      return keyword.toLowerCase();
    }
  }
  return "unranked";
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
      const { data: season } = await supabase
        .from("seasons")
        .select("status")
        .eq("id", seasonId!)
        .maybeSingle();

      if (!season) return [] as SeasonalPlayer[];

      let basePlayers: { user_id: string; points: number; wins: number; losses: number; tournaments_played: number; rank: number }[];

      if (season.status === "completed") {
        const { data: snapshots, error } = await supabase
          .from("season_snapshots")
          .select("*")
          .eq("season_id", seasonId!)
          .order("final_rank", { ascending: true });
        if (error) throw error;
        basePlayers = (snapshots ?? []).map((s) => ({
          user_id: s.user_id,
          points: s.final_points,
          wins: s.wins,
          losses: s.losses,
          tournaments_played: 0,
          rank: s.final_rank,
        }));
      } else {
        const { data: scores, error } = await supabase
          .from("season_scores")
          .select("*")
          .eq("season_id", seasonId!)
          .order("points", { ascending: false });
        if (error) throw error;
        basePlayers = (scores ?? []).map((s, i) => ({
          user_id: s.user_id,
          points: s.points,
          wins: s.wins,
          losses: s.losses,
          tournaments_played: s.tournaments_played,
          rank: i + 1,
        }));
      }

      if (basePlayers.length === 0) return [] as SeasonalPlayer[];

      const userIds = basePlayers.map((p) => p.user_id);

      // Fetch profiles, challenge counts, challenge names in parallel
      const [profilesRes, enrollmentsRes, challengeNamesRes] = await Promise.all([
        (supabase.from as any)("profiles_public")
          .select("user_id, display_name, gamer_tag, avatar_url")
          .in("user_id", userIds),
        supabase
          .from("challenge_enrollments")
          .select("user_id")
          .eq("status", "completed")
          .in("user_id", userIds),
        supabase
          .from("challenge_enrollments")
          .select("user_id, challenges!inner(name)")
          .eq("status", "completed")
          .in("user_id", userIds),
      ]);

      const profileMap = new Map(((profilesRes.data ?? []) as any[]).map((p: any) => [p.user_id, p]));

      const challengeCounts: Record<string, number> = {};
      (enrollmentsRes.data ?? []).forEach((e: any) => {
        challengeCounts[e.user_id] = (challengeCounts[e.user_id] || 0) + 1;
      });

      const userChallengeNames: Record<string, string[]> = {};
      (challengeNamesRes.data ?? []).forEach((e: any) => {
        const name = (e as any).challenges?.name;
        if (name) {
          if (!userChallengeNames[e.user_id]) userChallengeNames[e.user_id] = [];
          userChallengeNames[e.user_id].push(name);
        }
      });

      return basePlayers.map((bp) => {
        const profile = profileMap.get(bp.user_id);
        return {
          user_id: bp.user_id,
          display_name: profile?.gamer_tag || profile?.display_name || "Unknown",
          gamer_tag: profile?.gamer_tag ?? null,
          avatar_url: profile?.avatar_url ?? null,
          points: bp.points,
          wins: bp.wins,
          losses: bp.losses,
          tournaments_played: bp.tournaments_played,
          rank: bp.rank,
          tier: deriveTier(userChallengeNames[bp.user_id] || []),
          challenges_completed: challengeCounts[bp.user_id] || 0,
        } as SeasonalPlayer;
      });
    },
  });
};
