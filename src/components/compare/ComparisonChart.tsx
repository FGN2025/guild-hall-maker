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
import { useComparisonReport } from "@/hooks/useComparisonReport";

interface ComparisonChartProps {
  playerA: PlayerComparisonData;
  playerB: PlayerComparisonData;
  playerAId: string | null;
  playerBId: string | null;
}

const ComparisonChart = ({ playerA, playerB, playerAId, playerBId }: ComparisonChartProps) => {
  const { data: report, isLoading } = useComparisonReport(playerAId, playerBId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center min-h-[380px]">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report || report.radarData.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm min-h-[380px] flex items-center justify-center">
        No match data available for skills comparison.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-bold text-foreground mb-4 text-center">Skills Comparison</h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={report.radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="dimension"
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
            dataKey="scoreA"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name={playerB.display_name}
            dataKey="scoreB"
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
