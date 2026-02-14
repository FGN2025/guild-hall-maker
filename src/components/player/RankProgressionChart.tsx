import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import type { RankSnapshot } from "@/hooks/usePlayerProfile";

interface Props {
  data: RankSnapshot[];
}

const RankProgressionChart = ({ data }: Props) => {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground font-body">Not enough data for progression chart.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Win Rate Progression
        </h3>
      </div>
      <div className="p-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 16%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(220 10% 55%)", fontSize: 11 }}
              stroke="hsl(220 15% 16%)"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "hsl(220 10% 55%)", fontSize: 11 }}
              stroke="hsl(220 15% 16%)"
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220 18% 8%)",
                border: "1px solid hsl(220 15% 16%)",
                borderRadius: "8px",
                color: "hsl(180 10% 92%)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}%`, "Win Rate"]}
            />
            <Line
              type="monotone"
              dataKey="win_rate"
              stroke="hsl(180 100% 45%)"
              strokeWidth={2}
              dot={{ fill: "hsl(180 100% 45%)", r: 4 }}
              activeDot={{ r: 6, stroke: "hsl(280 80% 55%)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RankProgressionChart;
