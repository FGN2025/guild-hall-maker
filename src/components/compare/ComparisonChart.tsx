import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PlayerComparisonData } from "@/hooks/usePlayerComparison";

interface ComparisonChartProps {
  playerA: PlayerComparisonData;
  playerB: PlayerComparisonData;
}

const ComparisonChart = ({ playerA, playerB }: ComparisonChartProps) => {
  const maxPts = Math.max(playerA.totals.points, playerB.totals.points, 1);
  const maxWins = Math.max(playerA.totals.wins, playerB.totals.wins, 1);
  const maxTournaments = Math.max(playerA.totals.tournaments_played, playerB.totals.tournaments_played, 1);
  const maxSeasons = Math.max(playerA.totals.seasonsPlayed, playerB.totals.seasonsPlayed, 1);

  const data = [
    {
      stat: "Points",
      A: Math.round((playerA.totals.points / maxPts) * 100),
      B: Math.round((playerB.totals.points / maxPts) * 100),
    },
    {
      stat: "Wins",
      A: Math.round((playerA.totals.wins / maxWins) * 100),
      B: Math.round((playerB.totals.wins / maxWins) * 100),
    },
    {
      stat: "Win Rate",
      A: playerA.totals.winRate,
      B: playerB.totals.winRate,
    },
    {
      stat: "Tournaments",
      A: Math.round((playerA.totals.tournaments_played / maxTournaments) * 100),
      B: Math.round((playerB.totals.tournaments_played / maxTournaments) * 100),
    },
    {
      stat: "Seasons",
      A: Math.round((playerA.totals.seasonsPlayed / maxSeasons) * 100),
      B: Math.round((playerB.totals.seasonsPlayed / maxSeasons) * 100),
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-bold text-foreground mb-4 text-center">Performance Comparison</h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name={playerA.display_name}
            dataKey="A"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name={playerB.display_name}
            dataKey="B"
            stroke="hsl(var(--destructive))"
            fill="hsl(var(--destructive))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "hsl(var(--foreground))" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComparisonChart;
