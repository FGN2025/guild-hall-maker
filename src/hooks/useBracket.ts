import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BracketMatch {
  id: string;
  round: number;
  match_number: number;
  player1_name: string | null;
  player2_name: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  status: string;
  completed_at: string | null;
}

export interface TournamentInfo {
  id: string;
  name: string;
  game: string;
  format: string;
  status: string;
  max_participants: number;
}

export const useBracket = (tournamentId: string | undefined) => {
  const tournamentQuery = useQuery({
    queryKey: ["bracket-tournament", tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        game: data.game,
        format: data.format,
        status: data.status,
        max_participants: data.max_participants,
      } as TournamentInfo;
    },
  });

  const matchesQuery = useQuery({
    queryKey: ["bracket-matches", tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("match_results")
        .select("*")
        .eq("tournament_id", tournamentId!)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });

      if (error) throw error;
      if (!matches || matches.length === 0) return [] as BracketMatch[];

      // Get all player IDs
      const playerIds = [
        ...new Set(
          matches
            .flatMap((m) => [m.player1_id, m.player2_id])
            .filter(Boolean) as string[]
        ),
      ];

      const { data: profiles } =
        playerIds.length > 0
          ? await supabase
              .from("profiles")
              .select("user_id, display_name, gamer_tag, discord_username")
              .in("user_id", playerIds)
          : { data: [] };

      return matches.map((m) => {
        const p1Profile = (profiles ?? []).find((p) => p.user_id === m.player1_id);
        const p2Profile = (profiles ?? []).find((p) => p.user_id === m.player2_id);

        return {
          id: m.id,
          round: m.round,
          match_number: m.match_number,
          player1_name: p1Profile?.discord_username || p1Profile?.gamer_tag || p1Profile?.display_name || (m.player1_id ? "Unknown" : null),
          player2_name: p2Profile?.discord_username || p2Profile?.gamer_tag || p2Profile?.display_name || (m.player2_id ? "Unknown" : null),
          player1_score: m.player1_score,
          player2_score: m.player2_score,
          winner_id: m.winner_id,
          player1_id: m.player1_id,
          player2_id: m.player2_id,
          status: m.status,
          completed_at: m.completed_at,
        } as BracketMatch;
      });
    },
  });

  // Group matches by round
  const rounds = (matchesQuery.data ?? []).reduce<Record<number, BracketMatch[]>>(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {}
  );

  const totalRounds = Object.keys(rounds).length;
  const currentRound = Math.max(
    ...Object.entries(rounds)
      .filter(([_, matches]) => matches.some((m) => m.status !== "completed"))
      .map(([round]) => Number(round)),
    0
  );

  // Real-time subscription for live score updates
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`bracket-realtime-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bracket-matches", tournamentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, queryClient]);

  return {
    tournament: tournamentQuery.data ?? null,
    rounds,
    totalRounds,
    currentRound,
    matches: matchesQuery.data ?? [],
    isLoading: tournamentQuery.isLoading || matchesQuery.isLoading,
  };
};
