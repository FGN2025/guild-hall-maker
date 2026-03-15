import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerProfile {
  user_id: string;
  display_name: string;
  gamer_tag: string | null;
  avatar_url: string | null;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  win_rate: number;
  tournaments_played: number;
}

export interface MatchHistoryEntry {
  id: string;
  tournament_name: string;
  opponent_name: string;
  opponent_id: string | null;
  result: "win" | "loss" | "draw";
  player_score: number | null;
  opponent_score: number | null;
  completed_at: string | null;
  round: number;
}

export interface HeadToHeadRecord {
  opponent_id: string;
  opponent_name: string;
  opponent_avatar: string | null;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

export interface RankSnapshot {
  date: string;
  rank: number;
  win_rate: number;
}

export const usePlayerProfile = (userId: string | undefined) => {
  const profileQuery = useQuery({
    queryKey: ["player-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("profiles_public")
        .select("user_id, display_name, gamer_tag, avatar_url")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as PlayerProfile | null;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["player-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("match_results")
        .select("player1_id, player2_id, winner_id, status, tournament_id")
        .eq("status", "completed")
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

      if (error) throw error;
      if (!matches) return { wins: 0, losses: 0, draws: 0, total_matches: 0, win_rate: 0, tournaments_played: 0 } as PlayerStats;

      let wins = 0, losses = 0, draws = 0;
      const tournamentIds = new Set<string>();

      matches.forEach((m) => {
        tournamentIds.add(m.tournament_id);
        if (!m.winner_id) {
          draws++;
        } else if (m.winner_id === userId) {
          wins++;
        } else {
          losses++;
        }
      });

      const total = wins + losses + draws;
      return {
        wins,
        losses,
        draws,
        total_matches: total,
        win_rate: total > 0 ? Math.round((wins / total) * 100) : 0,
        tournaments_played: tournamentIds.size,
      } as PlayerStats;
    },
  });

  const matchHistoryQuery = useQuery({
    queryKey: ["player-match-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("match_results")
        .select("id, player1_id, player2_id, player1_score, player2_score, winner_id, completed_at, round, tournament_id, status")
        .eq("status", "completed")
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!matches || matches.length === 0) return [] as MatchHistoryEntry[];

      // Gather tournament IDs and opponent IDs
      const tournamentIds = [...new Set(matches.map((m) => m.tournament_id))];
      const opponentIds = [
        ...new Set(
          matches.map((m) => (m.player1_id === userId ? m.player2_id : m.player1_id)).filter(Boolean) as string[]
        ),
      ];

      const [tournamentsRes, profilesRes] = await Promise.all([
        supabase.from("tournaments").select("id, name").in("id", tournamentIds),
        opponentIds.length > 0
          ? (supabase.from as any)("profiles_public").select("user_id, display_name, gamer_tag").in("user_id", opponentIds)
          : Promise.resolve({ data: [] }),
      ]);

      const tournamentMap = new Map((tournamentsRes.data ?? []).map((t) => [t.id, t.name]));
      const profileMap = new Map(
        (profilesRes.data ?? []).map((p) => [p.user_id, p.gamer_tag || p.display_name || "Unknown"])
      );

      return matches.map((m): MatchHistoryEntry => {
        const isPlayer1 = m.player1_id === userId;
        const opponentId = isPlayer1 ? m.player2_id : m.player1_id;
        const result: "win" | "loss" | "draw" = !m.winner_id
          ? "draw"
          : m.winner_id === userId
          ? "win"
          : "loss";

        return {
          id: m.id,
          tournament_name: tournamentMap.get(m.tournament_id) ?? "Unknown Tournament",
          opponent_name: opponentId ? (profileMap.get(opponentId) ?? "Unknown") : "BYE",
          opponent_id: opponentId,
          result,
          player_score: isPlayer1 ? m.player1_score : m.player2_score,
          opponent_score: isPlayer1 ? m.player2_score : m.player1_score,
          completed_at: m.completed_at,
          round: m.round,
        };
      });
    },
  });

  const headToHeadQuery = useQuery({
    queryKey: ["player-h2h", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("match_results")
        .select("player1_id, player2_id, winner_id, status")
        .eq("status", "completed")
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

      if (error) throw error;
      if (!matches) return [] as HeadToHeadRecord[];

      const h2h: Record<string, { wins: number; losses: number; draws: number }> = {};

      matches.forEach((m) => {
        const opponentId = m.player1_id === userId ? m.player2_id : m.player1_id;
        if (!opponentId) return;

        if (!h2h[opponentId]) h2h[opponentId] = { wins: 0, losses: 0, draws: 0 };

        if (!m.winner_id) {
          h2h[opponentId].draws++;
        } else if (m.winner_id === userId) {
          h2h[opponentId].wins++;
        } else {
          h2h[opponentId].losses++;
        }
      });

      const opponentIds = Object.keys(h2h);
      if (opponentIds.length === 0) return [] as HeadToHeadRecord[];

      const { data: profiles } = await (supabase.from as any)("profiles_public")
        .select("user_id, display_name, gamer_tag, avatar_url")
        .in("user_id", opponentIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, { name: p.gamer_tag || p.display_name || "Unknown", avatar: p.avatar_url }])
      );

      return opponentIds
        .map((id): HeadToHeadRecord => {
          const s = h2h[id];
          const profile = profileMap.get(id);
          return {
            opponent_id: id,
            opponent_name: profile?.name ?? "Unknown",
            opponent_avatar: profile?.avatar ?? null,
            wins: s.wins,
            losses: s.losses,
            draws: s.draws,
            total: s.wins + s.losses + s.draws,
          };
        })
        .sort((a, b) => b.total - a.total);
    },
  });

  // Simulated rank progression based on match history dates
  const rankProgressionQuery = useQuery({
    queryKey: ["player-rank-progression", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: allMatches, error } = await supabase
        .from("match_results")
        .select("player1_id, player2_id, winner_id, completed_at, status")
        .eq("status", "completed")
        .order("completed_at", { ascending: true });

      if (error) throw error;
      if (!allMatches || allMatches.length === 0) return [] as RankSnapshot[];

      // Group matches by month and calculate cumulative stats
      const snapshots: RankSnapshot[] = [];
      let wins = 0, losses = 0, draws = 0;
      let lastMonth = "";

      allMatches.forEach((m) => {
        const isInvolved = m.player1_id === userId || m.player2_id === userId;
        if (!isInvolved) return;

        const month = m.completed_at ? m.completed_at.substring(0, 7) : "unknown";

        if (!m.winner_id) draws++;
        else if (m.winner_id === userId) wins++;
        else losses++;

        const total = wins + losses + draws;
        const wr = total > 0 ? Math.round((wins / total) * 100) : 0;

        if (month !== lastMonth && month !== "unknown") {
          snapshots.push({ date: month, rank: 0, win_rate: wr });
          lastMonth = month;
        } else if (snapshots.length > 0) {
          snapshots[snapshots.length - 1].win_rate = wr;
        }
      });

      return snapshots;
    },
  });

  return {
    profile: profileQuery.data,
    stats: statsQuery.data,
    matchHistory: matchHistoryQuery.data,
    headToHead: headToHeadQuery.data,
    rankProgression: rankProgressionQuery.data,
    isLoading:
      profileQuery.isLoading ||
      statsQuery.isLoading ||
      matchHistoryQuery.isLoading ||
      headToHeadQuery.isLoading ||
      rankProgressionQuery.isLoading,
  };
};
