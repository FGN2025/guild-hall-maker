import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MatchRow {
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  tournament_id: string;
}

export interface PlayerAchievementSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  unlocked: number;
  total: number;
  tiers: { bronze: number; silver: number; gold: number; platinum: number };
}

function computeAchievements(userId: string, matches: MatchRow[]) {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  const tournamentIds = new Set<string>();
  const tournamentWins = new Map<string, { wins: number; total: number }>();

  matches.forEach((m) => {
    if (m.player1_id !== userId && m.player2_id !== userId) return;
    tournamentIds.add(m.tournament_id);
    const tw = tournamentWins.get(m.tournament_id) ?? { wins: 0, total: 0 };
    tw.total++;

    if (!m.winner_id) {
      draws++;
      currentStreak = 0;
    } else if (m.winner_id === userId) {
      wins++;
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
      tw.wins++;
    } else {
      losses++;
      currentStreak = 0;
    }
    tournamentWins.set(m.tournament_id, tw);
  });

  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  let tournamentChampion = false;
  tournamentWins.forEach((tw) => {
    if (tw.total >= 2 && tw.wins === tw.total) tournamentChampion = true;
  });

  const checks = [
    { tier: "bronze" as const, pass: wins >= 1 },
    { tier: "silver" as const, pass: wins >= 5 },
    { tier: "gold" as const, pass: wins >= 20 },
    { tier: "bronze" as const, pass: bestStreak >= 3 },
    { tier: "silver" as const, pass: bestStreak >= 5 },
    { tier: "gold" as const, pass: bestStreak >= 10 },
    { tier: "bronze" as const, pass: total >= 10 },
    { tier: "gold" as const, pass: total >= 50 },
    { tier: "gold" as const, pass: winRate >= 75 && total >= 5 },
    { tier: "platinum" as const, pass: tournamentChampion },
    { tier: "silver" as const, pass: tournamentIds.size >= 3 },
    { tier: "bronze" as const, pass: total >= 10 && losses > 0 },
  ];

  const tiers = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  let unlocked = 0;
  checks.forEach((c) => {
    if (c.pass) {
      unlocked++;
      tiers[c.tier]++;
    }
  });

  return { unlocked, total: checks.length, tiers };
}

export const useGlobalAchievements = () => {
  return useQuery({
    queryKey: ["global-achievements"],
    queryFn: async () => {
      // Fetch all completed matches
      const { data: matches, error: mErr } = await supabase
        .from("match_results")
        .select("player1_id, player2_id, winner_id, tournament_id")
        .eq("status", "completed");

      if (mErr) throw mErr;

      // Collect unique player IDs
      const playerIds = new Set<string>();
      (matches ?? []).forEach((m) => {
        if (m.player1_id) playerIds.add(m.player1_id);
        if (m.player2_id) playerIds.add(m.player2_id);
      });

      if (playerIds.size === 0) return [];

      // Fetch profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(playerIds));

      if (pErr) throw pErr;

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      const results: PlayerAchievementSummary[] = [];
      playerIds.forEach((uid) => {
        const stats = computeAchievements(uid, matches ?? []);
        const profile = profileMap.get(uid);
        results.push({
          userId: uid,
          displayName: profile?.display_name ?? "Unknown",
          avatarUrl: profile?.avatar_url ?? null,
          unlocked: stats.unlocked,
          total: stats.total,
          tiers: stats.tiers,
        });
      });

      results.sort((a, b) => b.unlocked - a.unlocked);
      return results;
    },
  });
};
