import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const XP_RANKS = [
  { rank: "novice", label: "Novice", minXP: 0, maxXP: 99 },
  { rank: "apprentice", label: "Apprentice", minXP: 100, maxXP: 299 },
  { rank: "journeyman", label: "Journeyman", minXP: 300, maxXP: 599 },
  { rank: "expert", label: "Expert", minXP: 600, maxXP: 999 },
  { rank: "master", label: "Master", minXP: 1000, maxXP: Infinity },
];

export const getRankInfo = (xp: number) => {
  const current = XP_RANKS.find((r) => xp >= r.minXP && xp <= r.maxXP) || XP_RANKS[0];
  const currentIdx = XP_RANKS.indexOf(current);
  const next = currentIdx < XP_RANKS.length - 1 ? XP_RANKS[currentIdx + 1] : null;
  const progressInRank = next ? ((xp - current.minXP) / (next.minXP - current.minXP)) * 100 : 100;
  return { current, next, progressInRank, xp };
};

export const usePlayerQuestXP = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["player-quest-xp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_quest_xp")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const totalXP = data?.total_xp ?? 0;
  const rankInfo = getRankInfo(totalXP);

  return { totalXP, rankInfo, isLoading };
};
