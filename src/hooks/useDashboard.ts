import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStats {
  tournamentsRegistered: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  challengesCompleted: number;
  questsCompleted: number;
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

export interface DashboardActivityItem {
  id: string;
  refId: string;
  name: string;
  status: string;
  isCompleted: boolean;
  points: number;
  date: string | null;
  coverUrl: string | null;
}

export interface ActivitySummary {
  active: DashboardActivityItem[];
  completed: DashboardActivityItem[];
  totalCompleted: number;
  totalPoints: number;
  academyLinked: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const buildSummary = (
  enrollments: any[],
  catalog: Map<string, { name: string; points_reward: number | null; cover_image_url: string | null }>,
  completions: any[],
  refKey: "challenge_id" | "quest_id",
  academyLinked: boolean
): ActivitySummary => {
  const completionMap = new Map<string, any>();
  completions.forEach((c) => completionMap.set(c[refKey], c));

  const items: DashboardActivityItem[] = enrollments.map((e) => {
    const refId = e[refKey];
    const cat = catalog.get(refId);
    const comp = completionMap.get(refId);
    const isCompleted = !!comp;
    return {
      id: e.id,
      refId,
      name: cat?.name ?? "Untitled",
      status: e.status ?? (isCompleted ? "completed" : "active"),
      isCompleted,
      points: isCompleted ? comp?.awarded_points ?? 0 : cat?.points_reward ?? 0,
      date: isCompleted ? comp?.completed_at : e.enrolled_at,
      coverUrl: cat?.cover_image_url ?? null,
    };
  });

  const now = Date.now();
  const active = items
    .filter((i) => !i.isCompleted)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const completed = items
    .filter((i) => i.isCompleted && i.date && now - new Date(i.date).getTime() <= THIRTY_DAYS_MS)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return {
    active,
    completed,
    totalCompleted: completions.length,
    totalPoints: completions.reduce((s, c) => s + (c.awarded_points ?? 0), 0),
    academyLinked,
  };
};

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

      const tournamentIds = [...new Set(matches.map((m) => m.tournament_id))];
      const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id, name")
        .in("id", tournamentIds);

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

  const challengesQuery = useQuery({
    queryKey: ["dashboard-challenges", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<ActivitySummary> => {
      const [enrollRes, completeRes] = await Promise.all([
        supabase
          .from("challenge_enrollments")
          .select("id, challenge_id, status, enrolled_at")
          .eq("user_id", user!.id),
        supabase
          .from("challenge_completions")
          .select("challenge_id, awarded_points, completed_at, academy_synced")
          .eq("user_id", user!.id),
      ]);

      if (enrollRes.error) throw enrollRes.error;
      if (completeRes.error) throw completeRes.error;

      const enrollments = enrollRes.data ?? [];
      const completions = completeRes.data ?? [];
      const ids = [
        ...new Set([
          ...enrollments.map((e: any) => e.challenge_id),
          ...completions.map((c: any) => c.challenge_id),
        ]),
      ];

      const catalog = new Map<string, { name: string; points_reward: number | null; cover_image_url: string | null }>();
      if (ids.length > 0) {
        const { data: rows } = await supabase
          .from("challenges")
          .select("id, name, points_reward, cover_image_url")
          .in("id", ids);
        (rows ?? []).forEach((r: any) =>
          catalog.set(r.id, { name: r.name, points_reward: r.points_reward, cover_image_url: r.cover_image_url })
        );
      }

      const academyLinked = completions.some((c: any) => c.academy_synced === true);
      return buildSummary(enrollments, catalog, completions, "challenge_id", academyLinked);
    },
  });

  const questsQuery = useQuery({
    queryKey: ["dashboard-quests", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<ActivitySummary> => {
      const [enrollRes, completeRes] = await Promise.all([
        supabase
          .from("quest_enrollments")
          .select("id, quest_id, status, enrolled_at")
          .eq("user_id", user!.id),
        supabase
          .from("quest_completions")
          .select("quest_id, awarded_points, completed_at")
          .eq("user_id", user!.id),
      ]);

      if (enrollRes.error) throw enrollRes.error;
      if (completeRes.error) throw completeRes.error;

      const enrollments = enrollRes.data ?? [];
      const completions = completeRes.data ?? [];
      const ids = [
        ...new Set([
          ...enrollments.map((e: any) => e.quest_id),
          ...completions.map((c: any) => c.quest_id),
        ]),
      ];

      const catalog = new Map<string, { name: string; points_reward: number | null; cover_image_url: string | null }>();
      if (ids.length > 0) {
        const { data: rows } = await supabase
          .from("quests")
          .select("id, name, points_reward, cover_image_url")
          .in("id", ids);
        (rows ?? []).forEach((r: any) =>
          catalog.set(r.id, { name: r.name, points_reward: r.points_reward, cover_image_url: r.cover_image_url })
        );
      }

      return buildSummary(enrollments, catalog, completions, "quest_id", false);
    },
  });

  const pointsQuery = useQuery({
    queryKey: ["dashboard-points", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("season_scores")
        .select("points, points_available")
        .eq("user_id", user!.id);
      const rows = (data ?? []) as any[];
      return {
        totalPointsEarned: rows.reduce((s, r) => s + (r.points ?? 0), 0),
        pointsAvailable: rows.reduce((s, r) => s + (r.points_available ?? 0), 0),
      };
    },
  });

  const completedMatches = matchesQuery.data?.filter((m) => m.result !== "pending") ?? [];
  const wonMatches = matchesQuery.data?.filter((m) => m.result === "W") ?? [];

  const stats: DashboardStats = {
    tournamentsRegistered: registeredTournamentsQuery.data?.length ?? 0,
    matchesPlayed: completedMatches.length,
    matchesWon: wonMatches.length,
    winRate: completedMatches.length > 0 ? Math.round((wonMatches.length / completedMatches.length) * 100) : 0,
    challengesCompleted: challengesQuery.data?.totalCompleted ?? 0,
    questsCompleted: questsQuery.data?.totalCompleted ?? 0,
    totalPointsEarned: pointsQuery.data?.totalPointsEarned ?? 0,
    pointsAvailable: pointsQuery.data?.pointsAvailable ?? 0,
  };

  const emptyActivity: ActivitySummary = {
    active: [],
    completed: [],
    totalCompleted: 0,
    totalPoints: 0,
    academyLinked: false,
  };

  return {
    stats,
    registeredTournaments: registeredTournamentsQuery.data ?? [],
    recentMatches: matchesQuery.data ?? [],
    challenges: challengesQuery.data ?? emptyActivity,
    quests: questsQuery.data ?? emptyActivity,
    isLoading:
      registeredTournamentsQuery.isLoading ||
      matchesQuery.isLoading ||
      challengesQuery.isLoading ||
      questsQuery.isLoading ||
      pointsQuery.isLoading,
  };
};
