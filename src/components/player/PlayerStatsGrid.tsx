import { Trophy, Swords, Star, Award } from "lucide-react";
import type { PlayerStats } from "@/hooks/usePlayerProfile";

interface Props {
  stats: PlayerStats | undefined;
}

const PlayerStatsGrid = ({ stats }: Props) => {
  if (!stats) return null;

  const items = [
    { label: "Wins", value: stats.wins, icon: Trophy, color: "text-success" },
    { label: "Matches Played", value: stats.total_matches, icon: Swords, color: "text-primary" },
    { label: "Tournaments", value: stats.tournaments_played, icon: Award, color: "text-warning" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
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
