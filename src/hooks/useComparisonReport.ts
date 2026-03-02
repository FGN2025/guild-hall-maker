import { useMemo } from "react";
import { useSkillInsights, type SkillInsightsData } from "@/hooks/useSkillInsights";

export interface ComparisonRadarPoint {
  dimension: string;
  scoreA: number;
  scoreB: number;
  fullMark: number;
}

export interface ComparisonReportData {
  radarData: ComparisonRadarPoint[];
  summaryA: { winRate: number; marginScore: number; consistency: number; experience: number };
  summaryB: { winRate: number; marginScore: number; consistency: number; experience: number };
}

function percentileRank(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const count = values.filter((v) => v <= value).length;
  return (count / values.length) * 100;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function computeScores(data: SkillInsightsData) {
  const { gameInsights, genreInsights } = data;
  if (gameInsights.length === 0) {
    return { winRate: 0, marginScore: 0, consistency: 0, experience: 0, genres: new Map<string, number>() };
  }

  const allWinRates = gameInsights.map((g) => g.playerWinRate);
  const allMargins = gameInsights.map((g) => g.playerAvgMargin);
  const totalMatches = gameInsights.reduce((s, g) => s + g.playerMatches, 0);

  const overallWinRate =
    totalMatches > 0
      ? gameInsights.reduce((s, g) => s + g.playerWinRate * g.playerMatches, 0) / totalMatches
      : 0;
  const overallMargin =
    totalMatches > 0
      ? gameInsights.reduce((s, g) => s + g.playerAvgMargin * g.playerMatches, 0) / totalMatches
      : 0;

  const winRate = Math.round(Math.min(100, Math.max(0, overallWinRate)));
  const marginScore = Math.round(Math.min(100, Math.max(0, percentileRank(overallMargin, allMargins))));
  const consistency = Math.round(Math.max(0, Math.min(100, 100 - stdDev(allWinRates) * 2)));
  const experience = Math.round(Math.min(100, (totalMatches / 50) * 100));

  const genres = new Map<string, number>();
  for (const g of genreInsights) {
    genres.set(g.category, Math.round(g.avgWinRate));
  }

  return { winRate, marginScore, consistency, experience, genres };
}

export const useComparisonReport = (
  playerAId: string | null | undefined,
  playerBId: string | null | undefined
) => {
  const { data: insightsA, isLoading: loadingA } = useSkillInsights(playerAId ?? undefined);
  const { data: insightsB, isLoading: loadingB } = useSkillInsights(playerBId ?? undefined);

  const report = useMemo((): ComparisonReportData | null => {
    if (!insightsA || !insightsB) return null;

    const a = computeScores(insightsA);
    const b = computeScores(insightsB);

    // Build radar: core dimensions + union of genres
    const radarData: ComparisonRadarPoint[] = [
      { dimension: "Win Rate", scoreA: a.winRate, scoreB: b.winRate, fullMark: 100 },
      { dimension: "Score Margin", scoreA: a.marginScore, scoreB: b.marginScore, fullMark: 100 },
      { dimension: "Consistency", scoreA: a.consistency, scoreB: b.consistency, fullMark: 100 },
      { dimension: "Experience", scoreA: a.experience, scoreB: b.experience, fullMark: 100 },
    ];

    const allGenres = new Set([...a.genres.keys(), ...b.genres.keys()]);
    for (const genre of allGenres) {
      radarData.push({
        dimension: genre,
        scoreA: a.genres.get(genre) ?? 0,
        scoreB: b.genres.get(genre) ?? 0,
        fullMark: 100,
      });
    }

    return {
      radarData,
      summaryA: { winRate: a.winRate, marginScore: a.marginScore, consistency: a.consistency, experience: a.experience },
      summaryB: { winRate: b.winRate, marginScore: b.marginScore, consistency: b.consistency, experience: b.experience },
    };
  }, [insightsA, insightsB]);

  return { data: report, isLoading: loadingA || loadingB };
};
