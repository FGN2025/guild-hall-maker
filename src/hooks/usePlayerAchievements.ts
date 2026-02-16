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
  awardedBy?: string | null;
  category: "milestone" | "custom";
  notes?: string | null;
}

const TIER_ORDER = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

interface AutoCriteria {
  type: string;
  threshold?: number;
  min_matches?: number;
}

export const usePlayerAchievements = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["player-achievements", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Fetch definitions, player awards, and match data in parallel
      const [defsRes, awardsRes, matchesRes] = await Promise.all([
        supabase.from("achievement_definitions").select("*").eq("is_active", true).order("display_order"),
        supabase.from("player_achievements").select("*").eq("user_id", userId!),
        supabase
          .from("match_results")
          .select("player1_id, player2_id, winner_id, status, tournament_id, completed_at")
          .eq("status", "completed")
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
          .order("completed_at", { ascending: true }),
      ]);

      if (defsRes.error) throw defsRes.error;
      if (awardsRes.error) throw awardsRes.error;
      if (matchesRes.error) throw matchesRes.error;

      const defs = defsRes.data ?? [];
      const awards = new Map((awardsRes.data ?? []).map((a: any) => [a.achievement_id, a]));
      const m = matchesRes.data ?? [];

      // Compute stats from match data
      let wins = 0, losses = 0, draws = 0;
      let currentStreak = 0, bestStreak = 0;
      const tournamentIds = new Set<string>();
      const tournamentWins = new Map<string, { wins: number; total: number }>();

      m.forEach((match: any) => {
        tournamentIds.add(match.tournament_id);
        const tw = tournamentWins.get(match.tournament_id) ?? { wins: 0, total: 0 };
        tw.total++;
        if (!match.winner_id) { draws++; currentStreak = 0; }
        else if (match.winner_id === userId) { wins++; currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); tw.wins++; }
        else { losses++; currentStreak = 0; }
        tournamentWins.set(match.tournament_id, tw);
      });

      const total = wins + losses + draws;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      let tournamentChampion = false;
      tournamentWins.forEach((tw) => { if (tw.total >= 2 && tw.wins === tw.total) tournamentChampion = true; });

      const evalCriteria = (c: AutoCriteria): { pass: boolean; progress: number } => {
        switch (c.type) {
          case "wins": return { pass: wins >= (c.threshold ?? 0), progress: Math.min(wins, c.threshold ?? 0) };
          case "streak": return { pass: bestStreak >= (c.threshold ?? 0), progress: Math.min(bestStreak, c.threshold ?? 0) };
          case "matches": return { pass: total >= (c.threshold ?? 0), progress: Math.min(total, c.threshold ?? 0) };
          case "win_rate": return { pass: winRate >= (c.threshold ?? 0) && total >= (c.min_matches ?? 5), progress: total >= (c.min_matches ?? 5) ? Math.min(winRate, c.threshold ?? 0) : 0 };
          case "tournament_champion": return { pass: tournamentChampion, progress: tournamentChampion ? 1 : 0 };
          case "multi_tournament": return { pass: tournamentIds.size >= (c.threshold ?? 0), progress: Math.min(tournamentIds.size, c.threshold ?? 0) };
          case "iron_will": return { pass: total >= (c.threshold ?? 0) && losses > 0, progress: Math.min(total, c.threshold ?? 0) };
          default: return { pass: false, progress: 0 };
        }
      };

      const achievements: Achievement[] = defs.map((d: any) => {
        const award = awards.get(d.id);
        const criteria = d.auto_criteria as AutoCriteria | null;
        let unlocked = !!award;
        let progress: number | undefined;

        if (criteria) {
          const result = evalCriteria(criteria);
          if (result.pass) unlocked = true;
          progress = result.progress;
        }

        return {
          id: d.id,
          name: d.name,
          description: d.description,
          icon: d.icon as Achievement["icon"],
          tier: d.tier as Achievement["tier"],
          unlocked,
          progress,
          maxProgress: d.max_progress ?? undefined,
          awardedBy: award?.awarded_by ?? null,
          category: (d.category === "custom" ? "custom" : "milestone") as Achievement["category"],
          notes: award?.notes ?? null,
        };
      });

      achievements.sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return TIER_ORDER[b.tier] - TIER_ORDER[a.tier];
      });

      return achievements;
    },
  });
};
