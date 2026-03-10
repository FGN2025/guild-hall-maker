import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useQuestDetail = (questId: string | undefined) => {
  const { data: quest, isLoading: questLoading } = useQuery({
    queryKey: ["quest-detail", questId],
    enabled: !!questId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*, games(name, slug, cover_image_url, category), quest_chains(id, name, story_intro, story_outro, bonus_points)")
        .eq("id", questId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["quest-tasks", questId],
    enabled: !!questId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_tasks")
        .select("*")
        .eq("quest_id", questId!)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch sibling quests in same chain for breadcrumb navigation
  const chainId = (quest as any)?.chain_id;
  const { data: chainSiblings = [] } = useQuery({
    queryKey: ["quest-chain-siblings", chainId],
    enabled: !!chainId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("id, name, chain_order")
        .eq("chain_id", chainId!)
        .order("chain_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return { quest, tasks, chainSiblings, isLoading: questLoading };
};
