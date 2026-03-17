import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Tournament = Tables<"tournaments"> & {
  registrations_count: number;
  is_registered: boolean;
  game_cover_url?: string | null;
  effective_status: string;
};

export const useTournaments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tournamentsQuery = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data: tournaments, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;

      const { data: registrations } = await supabase
        .from("tournament_registrations")
        .select("tournament_id, user_id");

      const { data: games } = await supabase
        .from("games")
        .select("name, cover_image_url");

      const gameCovers = new Map(
        (games ?? []).map((g: any) => [g.name, g.cover_image_url])
      );

      return (tournaments ?? []).map((t) => {
        const regs = (registrations ?? []).filter((r) => r.tournament_id === t.id);
        return {
          ...t,
          registrations_count: regs.length,
          is_registered: user ? regs.some((r) => r.user_id === user.id) : false,
          game_cover_url: gameCovers.get(t.game) ?? null,
        } as Tournament;
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("tournament_registrations")
        .insert({ tournament_id: tournamentId, user_id: user.id });
      if (error) throw error;

      // Non-blocking: assign Discord role if configured
      supabase.functions
        .invoke("assign-tournament-role", {
          body: { tournament_id: tournamentId, user_id: user.id },
        })
        .then(({ error: fnErr }) => {
          if (fnErr) console.warn("Discord role assignment failed:", fnErr);
        });
    },
    onSuccess: () => {
      toast.success("Registered successfully!");
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
    onError: (err: Error) => {
      toast.error(err.message.includes("duplicate") ? "Already registered" : "Registration failed");
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("tournament_registrations")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled");
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
    onError: () => toast.error("Failed to cancel registration"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      game: string;
      description?: string;
      format: string;
      max_participants: number;
      prize_pool?: string;
      prize_type?: string;
      prize_id?: string;
      start_date: string;
      rules?: string;
      image_url?: string;
      prize_pct_first?: number;
      prize_pct_second?: number;
      prize_pct_third?: number;
      discord_role_id?: string;
      achievement_id?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("tournaments")
        .insert({ ...data, created_by: user.id, status: "open" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tournament created!");
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
    onError: () => toast.error("Failed to create tournament"),
  });

  return {
    tournaments: tournamentsQuery.data ?? [],
    isLoading: tournamentsQuery.isLoading,
    register: registerMutation.mutate,
    unregister: unregisterMutation.mutate,
    createTournament: createMutation.mutate,
    isRegistering: registerMutation.isPending,
    isCreating: createMutation.isPending,
  };
};
