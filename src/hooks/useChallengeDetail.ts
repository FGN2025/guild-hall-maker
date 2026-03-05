import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useChallengeDetail = (challengeId: string | undefined) => {
  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: ["challenge-detail", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*, games(name, slug, cover_image_url, category)")
        .eq("id", challengeId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["challenge-tasks", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_tasks")
        .select("*")
        .eq("challenge_id", challengeId!)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return { challenge, tasks, isLoading: challengeLoading };
};
