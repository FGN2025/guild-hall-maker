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

const TIER_PRIORITY = ["Champion", "Epic", "Platinum", "Gold", "Silver", "Bronze"];

function deriveTier(challengeNames: string[]): string {
  for (const keyword of TIER_PRIORITY) {
    if (challengeNames.some((n) => n.includes(keyword))) {
      return keyword.toLowerCase();
    }
  }
  return "unranked";
}

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ["leaderboard-alltime"],
    queryFn: async () => {
      // 1. Aggregate season_scores by user_id
      const { data: scores, error: scoresError } = await supabase
        .from("season_scores")
        .select("user_id, points, wins, losses, tournaments_played");
      if (scoresError) throw scoresError;
      if (!scores || scores.length === 0) return [] as LeaderboardPlayer[];

      const agg: Record<string, { points: number; wins: number; losses: number; tournaments_played: number }> = {};
      scores.forEach((s) => {
        if (!agg[s.user_id]) agg[s.user_id] = { points: 0, wins: 0, losses: 0, tournaments_played: 0 };
        agg[s.user_id].points += s.points;
        agg[s.user_id].wins += s.wins;
        agg[s.user_id].losses += s.losses;
        agg[s.user_id].tournaments_played += s.tournaments_played;
      });

      const playerIds = Object.keys(agg);

      // 2. Fetch profiles, challenge counts, and challenge names in parallel
      const [profilesRes, enrollmentsRes, challengeNamesRes] = await Promise.all([
        playerIds.length > 0
          ? (supabase.from as any)("profiles_public")
              .select("user_id, display_name, gamer_tag, avatar_url")
              .in("user_id", playerIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from("challenge_enrollments")
          .select("user_id")
          .eq("status", "completed")
          .in("user_id", playerIds),
        supabase
          .from("challenge_enrollments")
          .select("user_id, challenges!inner(name)")
          .eq("status", "completed")
          .in("user_id", playerIds),
      ]);

      const profileMap = new Map(((profilesRes.data ?? []) as any[]).map((p: any) => [p.user_id, p]));

      // Count challenges per user
      const challengeCounts: Record<string, number> = {};
      (enrollmentsRes.data ?? []).forEach((e: any) => {
        challengeCounts[e.user_id] = (challengeCounts[e.user_id] || 0) + 1;
      });

      // Gather challenge names per user for tier derivation
      const userChallengeNames: Record<string, string[]> = {};
      (challengeNamesRes.data ?? []).forEach((e: any) => {
        const name = (e as any).challenges?.name;
        if (name) {
          if (!userChallengeNames[e.user_id]) userChallengeNames[e.user_id] = [];
          userChallengeNames[e.user_id].push(name);
        }
      });

      // 3. Build leaderboard
      const leaderboard: LeaderboardPlayer[] = playerIds.map((uid) => {
        const s = agg[uid];
        const profile = profileMap.get(uid);
        const total = s.tournaments_played;
        return {
          user_id: uid,
          display_name: profile?.gamer_tag || profile?.display_name || "Unknown",
          gamer_tag: profile?.gamer_tag ?? null,
          avatar_url: profile?.avatar_url ?? null,
          wins: s.wins,
          losses: s.losses,
          draws: 0,
          total_matches: total,
          win_rate: total > 0 ? Math.round((s.wins / total) * 100) : 0,
          points: s.points,
          rank: 0,
          challenges_completed: challengeCounts[uid] || 0,
          tier: deriveTier(userChallengeNames[uid] || []),
        };
      });

      leaderboard.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.wins - a.wins;
      });

      leaderboard.forEach((p, i) => {
        p.rank = i + 1;
      });

      return leaderboard;
    },
  });
};
