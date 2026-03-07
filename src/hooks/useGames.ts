import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Game {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  guide_content: string | null;
  platform_tags: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type GameInsert = Omit<Game, "id" | "created_at" | "updated_at">;
export type GameUpdate = Partial<GameInsert>;

// Public: only active games
export const useGames = () => {
  return useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as unknown as Game[]) ?? [];
    },
  });
};

// Admin: all games regardless of is_active
export const useAdminGames = () => {
  return useQuery({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games" as any)
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as unknown as Game[]) ?? [];
    },
  });
};

export const useGameBySlug = (slug: string) => {
  return useQuery({
    queryKey: ["game", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Game | null;
    },
    enabled: !!slug,
  });
};

export const useGameTournaments = (gameName: string | undefined) => {
  return useQuery({
    queryKey: ["game-tournaments", gameName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("game", gameName!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!gameName,
  });
};

export const useCreateGame = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (game: GameInsert) => {
      const { data, error } = await supabase
        .from("games" as any)
        .insert(game as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      toast({ title: "Game created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateGame = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: GameUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("games" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      toast({ title: "Game updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteGame = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("games" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      toast({ title: "Game deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useBulkDeleteGames = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("games" as any).delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_data, ids) => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      toast({ title: `${ids.length} game(s) deleted` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useReorderGames = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from("games" as any)
          .update({ display_order: item.display_order } as any)
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      toast({ title: "Order updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};
