import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useQuestDetail = (questId: string | undefined) => {
  const { data: quest, isLoading: questLoading } = useQuery({
    queryKey: ["quest-detail", questId],
    enabled: !!questId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*, games(name, slug, cover_image_url, category)")
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

  return { quest, tasks, isLoading: questLoading };
};
