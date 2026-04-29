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
    queryKey: ["tournaments", user?.id ?? null],
    staleTime: 60_000,
    queryFn: async () => {
      // Fetch tournaments, per-tournament registration aggregates, user's own
      // registrations, and game covers in parallel. We avoid pulling every
      // registration row globally (privacy + perf).
      const [tournamentsRes, gamesRes, myRegsRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("*")
          .is("archived_at", null)
          .order("start_date", { ascending: true }),
        supabase.from("games").select("name, cover_image_url"),
        user
          ? supabase
              .from("tournament_registrations")
              .select("tournament_id")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as { tournament_id: string }[] }),
      ]);

      if (tournamentsRes.error) throw tournamentsRes.error;
      const tournaments = tournamentsRes.data ?? [];

      // Per-tournament registration counts (one query, scoped by IDs)
      const tournamentIds = tournaments.map((t) => t.id);
      const countsMap = new Map<string, number>();
      if (tournamentIds.length > 0) {
        const { data: regRows } = await supabase
          .from("tournament_registrations")
          .select("tournament_id")
          .in("tournament_id", tournamentIds);
        (regRows ?? []).forEach((r: any) => {
          countsMap.set(r.tournament_id, (countsMap.get(r.tournament_id) ?? 0) + 1);
        });
      }

      const myRegSet = new Set(
        ((myRegsRes as any).data ?? []).map((r: any) => r.tournament_id as string)
      );
      const gameCovers = new Map(
        (gamesRes.data ?? []).map((g: any) => [g.name, g.cover_image_url])
      );

      const now = new Date();
      return tournaments.map((t) => {
        const isPast = new Date(t.start_date) < now;
        const effective_status =
          (t.status === "open" || t.status === "upcoming") && isPast
            ? "closed"
            : t.status;
        return {
          ...t,
          registrations_count: countsMap.get(t.id) ?? 0,
          is_registered: myRegSet.has(t.id),
          game_cover_url: gameCovers.get(t.game) ?? null,
          effective_status,
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
