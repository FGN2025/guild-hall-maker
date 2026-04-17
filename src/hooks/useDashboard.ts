import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStats {
  tournamentsRegistered: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
}

export interface RegisteredTournament {
  id: string;
  name: string;
  game: string;
  status: string;
  start_date: string;
  format: string;
  registrations_count: number;
  max_participants: number;
  prize_pool: string | null;
}

export interface RecentMatch {
  id: string;
  tournament_name: string;
  opponent_name: string | null;
  player_score: number | null;
  opponent_score: number | null;
  result: "W" | "L" | "D" | "pending";
  round: number;
  match_number: number;
  completed_at: string | null;
}

export const useDashboard = () => {
  const { user } = useAuth();

  const registeredTournamentsQuery = useQuery({
    queryKey: ["dashboard-tournaments", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: regs, error: regsError } = await supabase
        .from("tournament_registrations")
        .select("tournament_id")
        .eq("user_id", user!.id);

      if (regsError) throw regsError;
      if (!regs || regs.length === 0) return [] as RegisteredTournament[];

      const tournamentIds = regs.map((r) => r.tournament_id);

      const [tournamentsRes, allRegsRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, name, game, status, start_date, format, max_participants, prize_pool")
          .in("id", tournamentIds)
          .order("start_date", { ascending: true }),
        supabase
          .from("tournament_registrations")
          .select("tournament_id")
          .in("tournament_id", tournamentIds),
      ]);

      if (tournamentsRes.error) throw tournamentsRes.error;

      const countsMap = new Map<string, number>();
      (allRegsRes.data ?? []).forEach((r: any) => {
        countsMap.set(r.tournament_id, (countsMap.get(r.tournament_id) ?? 0) + 1);
      });

      return (tournamentsRes.data ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        game: t.game,
        status: t.status,
        start_date: t.start_date,
        format: t.format,
        registrations_count: countsMap.get(t.id) ?? 0,
        max_participants: t.max_participants,
        prize_pool: t.prize_pool,
      })) as RegisteredTournament[];
    },
  });

  const matchesQuery = useQuery({
    queryKey: ["dashboard-matches", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("match_results")
        .select("id, tournament_id, player1_id, player2_id, player1_score, player2_score, winner_id, status, round, match_number, completed_at, created_at")
        .or(`player1_id.eq.${user!.id},player2_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!matches || matches.length === 0) return [] as RecentMatch[];

      // Get tournament names
      const tournamentIds = [...new Set(matches.map((m) => m.tournament_id))];
      const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id, name")
        .in("id", tournamentIds);

      // Get opponent display names
      const opponentIds = matches
        .map((m) => (m.player1_id === user!.id ? m.player2_id : m.player1_id))
        .filter(Boolean) as string[];
      
      const { data: profiles } = opponentIds.length > 0
        ? await (supabase.from as any)("profiles_public").select("user_id, display_name, gamer_tag").in("user_id", opponentIds)
        : { data: [] };

      return matches.map((m) => {
        const isPlayer1 = m.player1_id === user!.id;
        const opponentId = isPlayer1 ? m.player2_id : m.player1_id;
        const opponentProfile = (profiles ?? []).find((p) => p.user_id === opponentId);
        const tournament = (tournaments ?? []).find((t) => t.id === m.tournament_id);

        let result: RecentMatch["result"] = "pending";
        if (m.status === "completed" && m.winner_id) {
          result = m.winner_id === user!.id ? "W" : "L";
        } else if (m.status === "completed" && !m.winner_id) {
          result = "D";
        }

        return {
          id: m.id,
          tournament_name: tournament?.name ?? "Unknown",
          opponent_name: opponentProfile?.gamer_tag || opponentProfile?.display_name || "TBD",
          player_score: isPlayer1 ? m.player1_score : m.player2_score,
          opponent_score: isPlayer1 ? m.player2_score : m.player1_score,
          result,
          round: m.round,
          match_number: m.match_number,
          completed_at: m.completed_at,
        } as RecentMatch;
      });
    },
  });

  const stats: DashboardStats = {
    tournamentsRegistered: registeredTournamentsQuery.data?.length ?? 0,
    matchesPlayed: matchesQuery.data?.filter((m) => m.result !== "pending").length ?? 0,
    matchesWon: matchesQuery.data?.filter((m) => m.result === "W").length ?? 0,
    winRate:
      (matchesQuery.data?.filter((m) => m.result !== "pending").length ?? 0) > 0
        ? Math.round(
            ((matchesQuery.data?.filter((m) => m.result === "W").length ?? 0) /
              (matchesQuery.data?.filter((m) => m.result !== "pending").length ?? 1)) *
              100
          )
        : 0,
  };

  return {
    stats,
    registeredTournaments: registeredTournamentsQuery.data ?? [],
    recentMatches: matchesQuery.data ?? [],
    isLoading: registeredTournamentsQuery.isLoading || matchesQuery.isLoading,
  };
};
