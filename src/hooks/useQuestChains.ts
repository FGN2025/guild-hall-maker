import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useQuestChains = () => {
  const { user } = useAuth();

  const { data: chains = [], isLoading: chainsLoading } = useQuery({
    queryKey: ["quest-chains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_chains")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: chainQuests = [] } = useQuery({
    queryKey: ["quest-chain-quests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("id, name, chain_id, chain_order, xp_reward, points_first, difficulty, cover_image_url, is_active, games(name, cover_image_url)")
        .not("chain_id", "is", null)
        .order("chain_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myCompletions = [] } = useQuery({
    queryKey: ["my-quest-completions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_completions")
        .select("quest_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: chainCompletions = [] } = useQuery({
    queryKey: ["my-chain-completions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_chain_completions")
        .select("chain_id, bonus_points_awarded, completed_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedQuestIds = new Set(myCompletions.map((c: any) => c.quest_id));
  const completedChainIds = new Set(chainCompletions.map((c: any) => c.chain_id));

  const chainsWithProgress = chains.map((chain: any) => {
    const quests = chainQuests
      .filter((q: any) => q.chain_id === chain.id)
      .sort((a: any, b: any) => a.chain_order - b.chain_order);
    const completedCount = quests.filter((q: any) => completedQuestIds.has(q.id)).length;
    return {
      ...chain,
      quests,
      completedCount,
      totalCount: quests.length,
      isChainComplete: completedChainIds.has(chain.id),
    };
  });

  return {
    chains: chainsWithProgress,
    chainsLoading,
    completedQuestIds,
    completedChainIds,
  };
};
