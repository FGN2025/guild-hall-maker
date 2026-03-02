import { useMemo } from "react";
import { useSkillInsights, type SkillInsightsData } from "@/hooks/useSkillInsights";

export interface RadarDimension {
  dimension: string;
  score: number;
  fullMark: number;
}

export interface PlayerReportData {
  radarData: RadarDimension[];
  overallRating: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
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

function buildReport(data: SkillInsightsData): PlayerReportData {
  const { gameInsights, genreInsights } = data;

  if (gameInsights.length === 0) {
    return { radarData: [], overallRating: 0, strengths: [], weaknesses: [], tips: [] };
  }

  // Collect all player win rates & margins from insights (these are vs top-10 benchmarks,
  // but we can derive relative scores from the gap + absolute values)
  const allWinRates = gameInsights.map((g) => g.playerWinRate);
  const allMargins = gameInsights.map((g) => g.playerAvgMargin);

  // Overall win rate = weighted average by matches
  const totalMatches = gameInsights.reduce((s, g) => s + g.playerMatches, 0);
  const overallWinRate =
    totalMatches > 0
      ? gameInsights.reduce((s, g) => s + g.playerWinRate * g.playerMatches, 0) / totalMatches
      : 0;

  // Overall margin
  const overallMargin =
    totalMatches > 0
      ? gameInsights.reduce((s, g) => s + g.playerAvgMargin * g.playerMatches, 0) / totalMatches
      : 0;

  // Win rate score: use percentile among the player's own games (simple)
  const winRateScore = Math.round(Math.min(100, Math.max(0, overallWinRate)));

  // Margin score: normalize, cap at 100
  const marginScore = Math.round(
    Math.min(100, Math.max(0, percentileRank(overallMargin, allMargins)))
  );

  // Consistency: std dev of per-game win rates. Lower = better.
  const winRateStdDev = stdDev(allWinRates);
  // Map: 0 std dev = 100, 50+ std dev = 0
  const consistencyScore = Math.round(Math.max(0, Math.min(100, 100 - winRateStdDev * 2)));

  // Experience: total matches, scaled. 50+ matches = 100
  const experienceScore = Math.round(Math.min(100, (totalMatches / 50) * 100));

  const dimensions: RadarDimension[] = [
    { dimension: "Win Rate", score: winRateScore, fullMark: 100 },
    { dimension: "Score Margin", score: marginScore, fullMark: 100 },
    { dimension: "Consistency", score: consistencyScore, fullMark: 100 },
    { dimension: "Experience", score: experienceScore, fullMark: 100 },
  ];

  // Add genre dimensions
  for (const genre of genreInsights) {
    dimensions.push({
      dimension: genre.category,
      score: Math.round(genre.avgWinRate),
      fullMark: 100,
    });
  }

  // Overall rating = weighted average
  const overallRating = Math.round(
    dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length
  );

  // Sort for strengths/weaknesses
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3).map((d) => d.dimension);
  const weaknesses = sorted.slice(-2).map((d) => d.dimension);

  const tipMap: Record<string, string> = {
    "Win Rate": "Focus on mastering one or two games to boost your overall win rate.",
    "Score Margin": "Work on closing out games more decisively for bigger score margins.",
    "Consistency": "Try to maintain steady performance — avoid tilting after losses.",
    "Experience": "Play more matches to build experience and climb the ranks.",
  };

  const tips = weaknesses.map(
    (w) => tipMap[w] ?? `Improve your ${w} skills by studying top players in that genre.`
  );

  return { radarData: dimensions, overallRating, strengths, weaknesses, tips };
}

export const usePlayerReport = (userId: string | undefined) => {
  const { data: insights, isLoading } = useSkillInsights(userId);

  const report = useMemo(() => {
    if (!insights) return null;
    return buildReport(insights);
  }, [insights]);

  return { data: report, isLoading };
};
