import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const sendTournamentEmail = async (payload: {
  type: "tournament_started" | "score_posted" | "player_advanced";
  tournament_id: string;
  match_id?: string;
  winner_id?: string;
}) => {
  try {
    const { error } = await supabase.functions.invoke("send-tournament-email", {
      body: payload,
    });
    if (error) console.error("Email notification failed:", error);
  } catch (err) {
    console.error("Email notification error:", err);
  }
};

const awardSeasonPoints = async (winnerId: string, loserId: string | null, pointsWinner?: number, pointsLoser?: number) => {
  try {
    const { error } = await supabase.functions.invoke("award-season-points", {
      body: { winner_id: winnerId, loser_id: loserId, points_winner: pointsWinner, points_loser: pointsLoser },
    });
    if (error) console.error("Season points failed:", error);
  } catch (err) {
    console.error("Season points error:", err);
  }
};

export interface RegisteredPlayer {
  user_id: string;
  display_name: string;
  gamer_tag: string | null;
}

export interface ManageMatch {
  id: string;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  status: string;
}

export const useTournamentManagement = (tournamentId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tournamentQuery = useQuery({
    queryKey: ["manage-tournament", tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const playersQuery = useQuery({
    queryKey: ["manage-players", tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data: regs, error } = await supabase
        .from("tournament_registrations")
        .select("user_id")
        .eq("tournament_id", tournamentId!);
      if (error) throw error;
      if (!regs || regs.length === 0) return [] as RegisteredPlayer[];

      const userIds = regs.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, gamer_tag, discord_username")
        .in("user_id", userIds);

      return (profiles ?? []).map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name ?? "Unknown",
        gamer_tag: p.gamer_tag,
      })) as RegisteredPlayer[];
    },
  });

  const matchesQuery = useQuery({
    queryKey: ["manage-matches", tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("match_results")
        .select("*")
        .eq("tournament_id", tournamentId!)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });
      if (error) throw error;
      if (!matches || matches.length === 0) return [] as ManageMatch[];

      const playerIds = [
        ...new Set(
          matches.flatMap((m) => [m.player1_id, m.player2_id]).filter(Boolean) as string[]
        ),
      ];

      const { data: profiles } =
        playerIds.length > 0
          ? await supabase.from("profiles").select("user_id, display_name, gamer_tag, discord_username").in("user_id", playerIds)
          : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, (p as any).discord_username || p.gamer_tag || p.display_name || "Unknown"])
      );

      return matches.map((m) => ({
        id: m.id,
        round: m.round,
        match_number: m.match_number,
        player1_id: m.player1_id,
        player2_id: m.player2_id,
        player1_name: m.player1_id ? profileMap.get(m.player1_id) ?? "Unknown" : null,
        player2_name: m.player2_id ? profileMap.get(m.player2_id) ?? "Unknown" : null,
        player1_score: m.player1_score,
        player2_score: m.player2_score,
        winner_id: m.winner_id,
        status: m.status,
      })) as ManageMatch[];
    },
  });

  const generateBracketMutation = useMutation({
    mutationFn: async () => {
      if (!user || !tournamentId) throw new Error("Not authenticated");
      const players = playersQuery.data ?? [];
      if (players.length < 2) throw new Error("Need at least 2 registered players");

      // Shuffle players
      const shuffled = [...players].sort(() => Math.random() - 0.5);

      // Calculate rounds for single elimination
      const totalRounds = Math.ceil(Math.log2(shuffled.length));
      const totalSlots = Math.pow(2, totalRounds);

      // Pad with byes
      const padded = [...shuffled];
      while (padded.length < totalSlots) padded.push(null as any);

      // Create round 1 matches
      const round1Matches: { player1_id: string | null; player2_id: string | null; match_number: number }[] = [];
      for (let i = 0; i < padded.length; i += 2) {
        round1Matches.push({
          player1_id: padded[i]?.user_id ?? null,
          player2_id: padded[i + 1]?.user_id ?? null,
          match_number: Math.floor(i / 2) + 1,
        });
      }

      // Insert round 1 matches
      const matchInserts = round1Matches.map((m) => ({
        tournament_id: tournamentId,
        round: 1,
        match_number: m.match_number,
        player1_id: m.player1_id,
        player2_id: m.player2_id,
        status: "scheduled" as const,
      }));

      // Also create placeholder matches for subsequent rounds
      let matchesPerRound = round1Matches.length / 2;
      for (let round = 2; round <= totalRounds; round++) {
        for (let i = 0; i < matchesPerRound; i++) {
          matchInserts.push({
            tournament_id: tournamentId,
            round,
            match_number: i + 1,
            player1_id: null,
            player2_id: null,
            status: "scheduled" as const,
          });
        }
        matchesPerRound = Math.max(1, matchesPerRound / 2);
      }

      const { error } = await supabase.from("match_results").insert(matchInserts);
      if (error) throw error;

      // Update tournament status to in_progress
      await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId);
    },
    onSuccess: () => {
      toast.success("Bracket generated!");
      queryClient.invalidateQueries({ queryKey: ["manage-matches", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["manage-tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      // Send tournament started email
      if (tournamentId) {
        sendTournamentEmail({ type: "tournament_started", tournament_id: tournamentId });
      }
    },
    onError: (err: Error) => toast.error(err.message || "Failed to generate bracket"),
  });

  const updateScoreMutation = useMutation({
    mutationFn: async ({
      matchId,
      player1Score,
      player2Score,
    }: {
      matchId: string;
      player1Score: number;
      player2Score: number;
    }) => {
      if (!user || !tournamentId) throw new Error("Not authenticated");

      // Find the match to get player IDs
      const match = (matchesQuery.data ?? []).find((m) => m.id === matchId);
      if (!match) throw new Error("Match not found");

      const winnerId =
        player1Score > player2Score
          ? match.player1_id
          : player2Score > player1Score
          ? match.player2_id
          : null;

      const { error } = await supabase
        .from("match_results")
        .update({
          player1_score: player1Score,
          player2_score: player2Score,
          winner_id: winnerId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", matchId);
      if (error) throw error;

      // If there's a winner, advance them to next round
      if (winnerId) {
        const allMatches = matchesQuery.data ?? [];
        const nextRoundMatches = allMatches.filter((m) => m.round === match.round + 1);
        if (nextRoundMatches.length > 0) {
          const nextMatchIdx = Math.floor((match.match_number - 1) / 2);
          const nextMatch = nextRoundMatches[nextMatchIdx];
          if (nextMatch) {
            const isTopSlot = (match.match_number - 1) % 2 === 0;
            const updateField = isTopSlot ? { player1_id: winnerId } : { player2_id: winnerId };
            await supabase.from("match_results").update(updateField).eq("id", nextMatch.id);
          }
        }
        // Send advancement email
        if (tournamentId) {
          sendTournamentEmail({ type: "player_advanced", tournament_id: tournamentId, winner_id: winnerId });
        }
      }

      // Award season points using tournament-configured participation points per match
      if (winnerId) {
        const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
        const t = tournamentQuery.data;
        const participationPts = t?.points_participation ?? 2;
        // During regular matches, award participation points to both players
        awardSeasonPoints(winnerId, loserId, participationPts, participationPts);
      }

      // Send score posted email
      if (tournamentId) {
        sendTournamentEmail({ type: "score_posted", tournament_id: tournamentId, match_id: matchId });
      }
    },
    onSuccess: () => {
      toast.success("Score updated!");
      queryClient.invalidateQueries({ queryKey: ["manage-matches", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["bracket-matches", tournamentId] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update score"),
  });

  const resetBracketMutation = useMutation({
    mutationFn: async () => {
      if (!user || !tournamentId) throw new Error("Not authenticated");
      const { error: deleteError } = await supabase
        .from("match_results")
        .delete()
        .eq("tournament_id", tournamentId);
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from("tournaments")
        .update({ status: "open" as any })
        .eq("id", tournamentId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Bracket reset! Tournament is back to Open status.");
      queryClient.invalidateQueries({ queryKey: ["manage-matches", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["manage-tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["bracket-matches", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to reset bracket"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!user || !tournamentId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("tournaments")
        .update({ status: status as any })
        .eq("id", tournamentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tournament status updated!");
      queryClient.invalidateQueries({ queryKey: ["manage-tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const updateDetailsMutation = useMutation({
    mutationFn: async (details: {
      name: string;
      game: string;
      description?: string;
      format: string;
      max_participants: number;
      prize_pool?: string;
      start_date: string;
      rules?: string;
      points_first?: number;
      points_second?: number;
      points_third?: number;
      points_participation?: number;
    }) => {
      if (!user || !tournamentId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("tournaments")
        .update({
          name: details.name,
          game: details.game,
          description: details.description ?? null,
          format: details.format,
          max_participants: details.max_participants,
          prize_pool: details.prize_pool ?? null,
          start_date: details.start_date,
          rules: details.rules ?? null,
          points_first: details.points_first ?? 10,
          points_second: details.points_second ?? 5,
          points_third: details.points_third ?? 3,
          points_participation: details.points_participation ?? 2,
        } as any)
        .eq("id", tournamentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tournament details updated!");
      queryClient.invalidateQueries({ queryKey: ["manage-tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
    onError: () => toast.error("Failed to update tournament details"),
  });

  const isOwner = !!(user && tournamentQuery.data && tournamentQuery.data.created_by === user.id);

  // Real-time subscription for live match updates
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`manage-realtime-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["manage-matches", tournamentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, queryClient]);

  return {
    tournament: tournamentQuery.data ?? null,
    players: playersQuery.data ?? [],
    matches: matchesQuery.data ?? [],
    isLoading: tournamentQuery.isLoading || playersQuery.isLoading || matchesQuery.isLoading,
    isOwner,
    generateBracket: generateBracketMutation.mutate,
    isGenerating: generateBracketMutation.isPending,
    updateScore: updateScoreMutation.mutate,
    isUpdatingScore: updateScoreMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateDetails: updateDetailsMutation.mutate,
    isUpdatingDetails: updateDetailsMutation.isPending,
    resetBracket: resetBracketMutation.mutate,
    isResettingBracket: resetBracketMutation.isPending,
  };
};
