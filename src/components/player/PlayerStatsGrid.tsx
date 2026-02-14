import { Trophy, XCircle, Minus, TrendingUp } from "lucide-react";
import type { PlayerStats } from "@/hooks/usePlayerProfile";

interface Props {
  stats: PlayerStats | undefined;
}

const PlayerStatsGrid = ({ stats }: Props) => {
  if (!stats) return null;

  const items = [
    { label: "Wins", value: stats.wins, icon: Trophy, color: "text-success" },
    { label: "Losses", value: stats.losses, icon: XCircle, color: "text-destructive" },
    { label: "Draws", value: stats.draws, icon: Minus, color: "text-warning" },
    { label: "Win Rate", value: `${stats.win_rate}%`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2 glow-card"
        >
          <item.icon className={`h-5 w-5 ${item.color}`} />
          <span className="font-display text-2xl font-bold text-foreground">{item.value}</span>
          <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default PlayerStatsGrid;
