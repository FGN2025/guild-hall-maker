import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantPlayerAchievement {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  unlocked: number;
  tiers: { bronze: number; silver: number; gold: number; platinum: number };
}

export function useTenantAchievements(tenantId: string | null) {
  return useQuery({
    queryKey: ["tenant-achievements", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      // 1. Get user IDs from leads (user_service_interests) and matched legacy users
      const [leadsRes, legacyRes] = await Promise.all([
        supabase
          .from("user_service_interests")
          .select("user_id")
          .eq("tenant_id", tenantId!),
        (supabase as any)
          .from("legacy_users")
          .select("matched_user_id")
          .eq("tenant_id", tenantId!)
          .not("matched_user_id", "is", null),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (legacyRes.error) throw legacyRes.error;

      const userIds = new Set<string>();
      (leadsRes.data ?? []).forEach((r: any) => userIds.add(r.user_id));
      (legacyRes.data ?? []).forEach((r: any) => userIds.add(r.matched_user_id));

      if (userIds.size === 0) return [];

      // 2. Fetch player_achievements with tier info for these users
      const { data: awards, error: awardsErr } = await supabase
        .from("player_achievements")
        .select("user_id, achievement_id, achievement_definitions(tier)")
        .in("user_id", Array.from(userIds));

      if (awardsErr) throw awardsErr;
      if (!awards || awards.length === 0) return [];

      // 3. Group by user
      const userMap = new Map<string, { unlocked: number; tiers: { bronze: number; silver: number; gold: number; platinum: number } }>();

      awards.forEach((a: any) => {
        const entry = userMap.get(a.user_id) ?? { unlocked: 0, tiers: { bronze: 0, silver: 0, gold: 0, platinum: 0 } };
        entry.unlocked++;
        const tier = (a.achievement_definitions as any)?.tier as string;
        if (tier && tier in entry.tiers) {
          entry.tiers[tier as keyof typeof entry.tiers]++;
        }
        userMap.set(a.user_id, entry);
      });

      // 4. Fetch profiles
      const { data: profiles } = await (supabase.from as any)("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(userMap.keys()));

      const profileMap = new Map(((profiles ?? []) as any[]).map((p: any) => [p.user_id, p]));

      const results: TenantPlayerAchievement[] = [];
      userMap.forEach((stats, uid) => {
        const profile = profileMap.get(uid);
        results.push({
          userId: uid,
          displayName: profile?.display_name ?? "Unknown",
          avatarUrl: profile?.avatar_url ?? null,
          unlocked: stats.unlocked,
          tiers: stats.tiers,
        });
      });

      results.sort((a, b) => b.unlocked - a.unlocked);
      return results;
    },
  });
}
