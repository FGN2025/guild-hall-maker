import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDiscordClientId = () => {
  const { data } = useQuery({
    queryKey: ["discord-client-id"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "discord_client_id")
        .maybeSingle();
      if (error) throw error;
      return data?.value || null;
    },
    staleTime: Infinity,
  });

  return data ?? null;
};
