import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerAchievementSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  unlocked: number;
  total: number;
  tiers: { bronze: number; silver: number; gold: number; platinum: number };
}

export const useGlobalAchievements = () => {
  return useQuery({
    queryKey: ["global-achievements"],
    queryFn: async () => {
      // Fetch total active definitions count and all player awards with definition tiers
      const [defsRes, awardsRes] = await Promise.all([
        supabase.from("achievement_definitions").select("id", { count: "exact" }).eq("is_active", true),
        supabase
          .from("player_achievements")
          .select("user_id, achievement_id, achievement_definitions(tier)")
      ]);

      if (defsRes.error) throw defsRes.error;
      if (awardsRes.error) throw awardsRes.error;

      const totalDefs = defsRes.count ?? 0;
      const awards = awardsRes.data ?? [];

      // Group by user
      const userMap = new Map<string, { unlocked: number; tiers: { bronze: number; silver: number; gold: number; platinum: number } }>();
      const userIds = new Set<string>();

      awards.forEach((a: any) => {
        userIds.add(a.user_id);
        const entry = userMap.get(a.user_id) ?? { unlocked: 0, tiers: { bronze: 0, silver: 0, gold: 0, platinum: 0 } };
        entry.unlocked++;
        const tier = (a.achievement_definitions as any)?.tier as string;
        if (tier && tier in entry.tiers) {
          entry.tiers[tier as keyof typeof entry.tiers]++;
        }
        userMap.set(a.user_id, entry);
      });

      if (userIds.size === 0) return [];

      // Fetch profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(userIds));
      if (pErr) throw pErr;

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      const results: PlayerAchievementSummary[] = [];
      userMap.forEach((stats, uid) => {
        const profile = profileMap.get(uid);
        results.push({
          userId: uid,
          displayName: profile?.display_name ?? "Unknown",
          avatarUrl: profile?.avatar_url ?? null,
          unlocked: stats.unlocked,
          total: totalDefs,
          tiers: stats.tiers,
        });
      });

      results.sort((a, b) => b.unlocked - a.unlocked);
      return results;
    },
  });
};
