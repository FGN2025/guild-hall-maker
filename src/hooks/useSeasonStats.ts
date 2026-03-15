import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeasons, type Season } from "./useSeasonalLeaderboard";

export interface SeasonStatsData {
  totalPlayers: number;
  totalMatches: number;
  totalPoints: number;
  avgPointsPerMatch: number;
  topPlayers: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    points: number;
    wins: number;
    losses: number;
    tournaments_played: number;
  }[];
  tierDistribution: { tier: string; count: number }[];
  seasonProgression: {
    season_name: string;
    total_points: number;
    total_players: number;
    avg_points: number;
  }[];
}

export { useSeasons };

export const useSeasonStats = (seasonId: string | null) => {
  return useQuery({
    queryKey: ["season-stats", seasonId],
    enabled: !!seasonId,
    queryFn: async (): Promise<SeasonStatsData> => {
      const { data: season } = await supabase
        .from("seasons")
        .select("status")
        .eq("id", seasonId!)
        .maybeSingle();

      if (!season) {
        return emptyStats();
      }

      if (season.status === "completed") {
        return buildFromSnapshots(seasonId!);
      }
      return buildFromScores(seasonId!);
    },
  });
};

export const useSeasonProgression = () => {
  return useQuery({
    queryKey: ["season-progression"],
    queryFn: async () => {
      // Get all completed seasons with their snapshots aggregated
      const { data: seasons } = await supabase
        .from("seasons")
        .select("id, name, status")
        .order("start_date", { ascending: true });

      if (!seasons || seasons.length === 0) return [];

      const progression: {
        season_name: string;
        total_points: number;
        total_players: number;
        avg_points: number;
      }[] = [];

      for (const s of seasons) {
        if (s.status === "completed") {
          const { data: snaps } = await supabase
            .from("season_snapshots")
            .select("final_points")
            .eq("season_id", s.id);
          const pts = (snaps ?? []).reduce((sum, r) => sum + r.final_points, 0);
          const count = (snaps ?? []).length;
          progression.push({
            season_name: s.name,
            total_points: pts,
            total_players: count,
            avg_points: count > 0 ? Math.round(pts / count) : 0,
          });
        } else if (s.status === "active") {
          const { data: scores } = await supabase
            .from("season_scores")
            .select("points")
            .eq("season_id", s.id);
          const pts = (scores ?? []).reduce((sum, r) => sum + r.points, 0);
          const count = (scores ?? []).length;
          progression.push({
            season_name: s.name + " (live)",
            total_points: pts,
            total_players: count,
            avg_points: count > 0 ? Math.round(pts / count) : 0,
          });
        }
      }

      return progression;
    },
  });
};

function emptyStats(): SeasonStatsData {
  return {
    totalPlayers: 0,
    totalMatches: 0,
    totalPoints: 0,
    avgPointsPerMatch: 0,
    topPlayers: [],
    tierDistribution: [],
    seasonProgression: [],
  };
}

async function buildFromScores(seasonId: string): Promise<SeasonStatsData> {
  const { data: scores } = await supabase
    .from("season_scores")
    .select("*")
    .eq("season_id", seasonId)
    .order("points", { ascending: false });

  const rows = scores ?? [];
  const userIds = rows.map((s) => s.user_id);
  const { data: profiles } = userIds.length > 0
    ? await (supabase.from as any)("profiles_public").select("user_id, display_name, gamer_tag, avatar_url").in("user_id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const totalPlayers = rows.length;
  const totalPoints = rows.reduce((s, r) => s + r.points, 0);
  const totalMatches = rows.reduce((s, r) => s + r.wins + r.losses, 0);
  const avgPointsPerMatch = totalMatches > 0 ? Math.round((totalPoints / totalMatches) * 10) / 10 : 0;

  // Tier distribution (calculated the same way as leaderboard)
  const tiers: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0, none: 0 };
  rows.forEach((_, i) => {
    const rank = i + 1;
    const pct = totalPlayers > 0 ? rank / totalPlayers : 1;
    if (pct <= 0.05) tiers.platinum++;
    else if (pct <= 0.15) tiers.gold++;
    else if (pct <= 0.35) tiers.silver++;
    else if (pct <= 0.60) tiers.bronze++;
    else tiers.none++;
  });

  const topPlayers = rows.slice(0, 10).map((s) => {
    const p = profileMap.get(s.user_id);
    return {
      user_id: s.user_id,
      display_name: p?.gamer_tag || p?.display_name || "Unknown",
      avatar_url: p?.avatar_url ?? null,
      points: s.points,
      wins: s.wins,
      losses: s.losses,
      tournaments_played: s.tournaments_played,
    };
  });

  return {
    totalPlayers,
    totalMatches,
    totalPoints,
    avgPointsPerMatch,
    topPlayers,
    tierDistribution: Object.entries(tiers)
      .filter(([k]) => k !== "none")
      .map(([tier, count]) => ({ tier, count })),
    seasonProgression: [],
  };
}

async function buildFromSnapshots(seasonId: string): Promise<SeasonStatsData> {
  const { data: snaps } = await supabase
    .from("season_snapshots")
    .select("*")
    .eq("season_id", seasonId)
    .order("final_rank", { ascending: true });

  const rows = snaps ?? [];
  const userIds = rows.map((s) => s.user_id);
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("user_id, display_name, gamer_tag, avatar_url").in("user_id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const totalPlayers = rows.length;
  const totalPoints = rows.reduce((s, r) => s + r.final_points, 0);
  const totalMatches = rows.reduce((s, r) => s + r.wins + r.losses, 0);
  const avgPointsPerMatch = totalMatches > 0 ? Math.round((totalPoints / totalMatches) * 10) / 10 : 0;

  const tiers: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  rows.forEach((r) => {
    if (r.tier in tiers) tiers[r.tier]++;
  });

  const topPlayers = rows.slice(0, 10).map((s) => {
    const p = profileMap.get(s.user_id);
    return {
      user_id: s.user_id,
      display_name: p?.gamer_tag || p?.display_name || "Unknown",
      avatar_url: p?.avatar_url ?? null,
      points: s.final_points,
      wins: s.wins,
      losses: s.losses,
      tournaments_played: 0,
    };
  });

  return {
    totalPlayers,
    totalMatches,
    totalPoints,
    avgPointsPerMatch,
    topPlayers,
    tierDistribution: Object.entries(tiers).map(([tier, count]) => ({ tier, count })),
    seasonProgression: [],
  };
}
