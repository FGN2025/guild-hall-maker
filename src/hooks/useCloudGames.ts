import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CloudGame {
  id: string;
  blacknut_game_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  genre: string | null;
  deep_link_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type CloudGameInput = {
  blacknut_game_id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  genre?: string | null;
  deep_link_url?: string | null;
  is_active?: boolean;
};

const QUERY_KEY = ["cloud-games"];

export const useCloudGames = () => {
  const queryClient = useQueryClient();

  const { data: games = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cloud_games")
        .select("*")
        .order("title");
      if (error) throw error;
      return data as CloudGame[];
    },
  });

  const createGame = useMutation({
    mutationFn: async (input: CloudGameInput) => {
      const { error } = await supabase.from("cloud_games").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cloud game added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateGame = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CloudGameInput> & { id: string }) => {
      const { error } = await supabase
        .from("cloud_games")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cloud game updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteGame = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cloud_games").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cloud game removed!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { games, isLoading, createGame, updateGame, deleteGame };
};
