import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: "trophy" | "flame" | "star" | "crown" | "target" | "shield" | "swords" | "zap" | "medal";
  tier: "bronze" | "silver" | "gold" | "platinum";
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

const TIER_ORDER = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

export const usePlayerAchievements = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["player-achievements", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("match_results")
        .select("player1_id, player2_id, winner_id, status, tournament_id, completed_at")
        .eq("status", "completed")
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order("completed_at", { ascending: true });

      if (error) throw error;
      const m = matches ?? [];

      let wins = 0, losses = 0, draws = 0;
      let currentStreak = 0, bestStreak = 0;
      const tournamentIds = new Set<string>();
      const tournamentWins = new Map<string, { wins: number; total: number }>();

      m.forEach((match) => {
        tournamentIds.add(match.tournament_id);
        const tw = tournamentWins.get(match.tournament_id) ?? { wins: 0, total: 0 };
        tw.total++;

        if (!match.winner_id) {
          draws++;
          currentStreak = 0;
        } else if (match.winner_id === userId) {
          wins++;
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
          tw.wins++;
        } else {
          losses++;
          currentStreak = 0;
        }
        tournamentWins.set(match.tournament_id, tw);
      });

      const total = wins + losses + draws;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      // Check if player won any tournament (won all matches in a tournament with 2+ matches)
      let tournamentChampion = false;
      tournamentWins.forEach((tw) => {
        if (tw.total >= 2 && tw.wins === tw.total) tournamentChampion = true;
      });

      const achievements: Achievement[] = [
        {
          id: "first_win",
          name: "First Blood",
          description: "Win your first match",
          icon: "zap",
          tier: "bronze",
          unlocked: wins >= 1,
          progress: Math.min(wins, 1),
          maxProgress: 1,
        },
        {
          id: "five_wins",
          name: "Rising Star",
          description: "Win 5 matches",
          icon: "star",
          tier: "silver",
          unlocked: wins >= 5,
          progress: Math.min(wins, 5),
          maxProgress: 5,
        },
        {
          id: "twenty_wins",
          name: "Veteran Fighter",
          description: "Win 20 matches",
          icon: "medal",
          tier: "gold",
          unlocked: wins >= 20,
          progress: Math.min(wins, 20),
          maxProgress: 20,
        },
        {
          id: "streak_3",
          name: "On Fire",
          description: "Win 3 matches in a row",
          icon: "flame",
          tier: "bronze",
          unlocked: bestStreak >= 3,
          progress: Math.min(bestStreak, 3),
          maxProgress: 3,
        },
        {
          id: "streak_5",
          name: "Unstoppable",
          description: "Win 5 matches in a row",
          icon: "flame",
          tier: "silver",
          unlocked: bestStreak >= 5,
          progress: Math.min(bestStreak, 5),
          maxProgress: 5,
        },
        {
          id: "streak_10",
          name: "Legendary Streak",
          description: "Win 10 matches in a row",
          icon: "flame",
          tier: "gold",
          unlocked: bestStreak >= 10,
          progress: Math.min(bestStreak, 10),
          maxProgress: 10,
        },
        {
          id: "ten_matches",
          name: "Competitor",
          description: "Play 10 matches",
          icon: "swords",
          tier: "bronze",
          unlocked: total >= 10,
          progress: Math.min(total, 10),
          maxProgress: 10,
        },
        {
          id: "fifty_matches",
          name: "Seasoned Warrior",
          description: "Play 50 matches",
          icon: "swords",
          tier: "gold",
          unlocked: total >= 50,
          progress: Math.min(total, 50),
          maxProgress: 50,
        },
        {
          id: "win_rate_75",
          name: "Elite Player",
          description: "Achieve a 75%+ win rate (min 5 matches)",
          icon: "target",
          tier: "gold",
          unlocked: winRate >= 75 && total >= 5,
          progress: total >= 5 ? Math.min(winRate, 75) : 0,
          maxProgress: 75,
        },
        {
          id: "tournament_champ",
          name: "Tournament Champion",
          description: "Win all matches in a tournament",
          icon: "crown",
          tier: "platinum",
          unlocked: tournamentChampion,
        },
        {
          id: "multi_tournament",
          name: "Circuit Player",
          description: "Compete in 3 different tournaments",
          icon: "shield",
          tier: "silver",
          unlocked: tournamentIds.size >= 3,
          progress: Math.min(tournamentIds.size, 3),
          maxProgress: 3,
        },
        {
          id: "iron_will",
          name: "Iron Will",
          description: "Play 10 matches without giving up",
          icon: "shield",
          tier: "bronze",
          unlocked: total >= 10 && losses > 0,
          progress: Math.min(total, 10),
          maxProgress: 10,
        },
      ];

      // Sort: unlocked first, then by tier
      achievements.sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return TIER_ORDER[b.tier] - TIER_ORDER[a.tier];
      });

      return achievements;
    },
  });
};
