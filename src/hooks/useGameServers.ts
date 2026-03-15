import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface GameServer {
  id: string;
  name: string;
  game: string;
  game_id: string | null;
  ip_address: string;
  port: number | null;
  description: string | null;
  image_url: string | null;
  max_players: number | null;
  connection_instructions: string | null;
  panel_type: string | null;
  panel_url: string | null;
  panel_server_id: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  games?: { name: string; cover_image_url: string | null } | null;
}

export type GameServerInput = Omit<GameServer, "id" | "created_at" | "updated_at" | "created_by" | "games">;

export function useGameServers() {
  return useQuery({
    queryKey: ["game-servers"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("game_servers") as any)
        .select("*, games:game_id(name, cover_image_url)")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as GameServer[];
    },
  });
}

export function useAdminGameServers() {
  return useQuery({
    queryKey: ["game-servers-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("game_servers") as any)
        .select("*, games(name, cover_image_url)")
        .order("display_order");
      if (error) throw error;
      return data as GameServer[];
    },
  });
}

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GameServerInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase.from("game_servers") as any).insert({ ...input, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["game-servers"] });
      qc.invalidateQueries({ queryKey: ["game-servers-admin"] });
      toast({ title: "Server added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<GameServerInput> & { id: string }) => {
      const { error } = await (supabase.from("game_servers") as any).update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["game-servers"] });
      qc.invalidateQueries({ queryKey: ["game-servers-admin"] });
      toast({ title: "Server updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("game_servers") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["game-servers"] });
      qc.invalidateQueries({ queryKey: ["game-servers-admin"] });
      toast({ title: "Server deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useServerStatus(serverId: string | null, enabled = false) {
  return useQuery({
    queryKey: ["server-status", serverId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("game-server-status", {
        body: { server_id: serverId },
      });
      if (error) throw error;
      return data as { is_online: boolean | null; current_players: number | null; max_players: number | null; state?: string };
    },
    enabled: !!serverId && enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
