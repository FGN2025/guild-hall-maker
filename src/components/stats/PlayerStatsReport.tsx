import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { usePlayerReport } from "@/hooks/usePlayerReport";
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

interface PlayerStatsReportProps {
  userId: string;
}

const PlayerStatsReport = ({ userId }: PlayerStatsReportProps) => {
  const { data: report, isLoading } = usePlayerReport(userId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report || report.radarData.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">Skills Overview</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-heading text-muted-foreground uppercase tracking-wider">
            Overall Rating
          </span>
          <span className="font-display text-2xl font-bold text-primary">{report.overallRating}</span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="w-full flex justify-center">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={report.radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "inherit" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tickCount={5}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              axisLine={false}
            />
            <Radar
              name="Skills"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-heading text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span>Strengths</span>
          </div>
          <ul className="space-y-1">
            {report.strengths.map((s) => (
              <li key={s} className="text-sm text-foreground font-body flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-heading text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <span>Areas to Improve</span>
          </div>
          <ul className="space-y-1">
            {report.weaknesses.map((w) => (
              <li key={w} className="text-sm text-foreground font-body flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive inline-block" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tips */}
      {report.tips.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-sm font-heading text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span>Improvement Tips</span>
          </div>
          <ul className="space-y-1">
            {report.tips.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground font-body">
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PlayerStatsReport;
