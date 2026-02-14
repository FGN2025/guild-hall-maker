import Navbar from "@/components/Navbar";
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from "lucide-react";

const players = [
  { rank: 1, name: "ShadowStrike", rating: 2847, wins: 142, losses: 31, trend: "up" },
  { rank: 2, name: "NeonPhantom", rating: 2801, wins: 138, losses: 35, trend: "up" },
  { rank: 3, name: "CyberWolf", rating: 2756, wins: 127, losses: 29, trend: "down" },
  { rank: 4, name: "BlazeMaster", rating: 2699, wins: 119, losses: 42, trend: "same" },
  { rank: 5, name: "PixelQueen", rating: 2654, wins: 115, losses: 38, trend: "up" },
  { rank: 6, name: "VortexKing", rating: 2611, wins: 108, losses: 41, trend: "down" },
  { rank: 7, name: "StormRider", rating: 2589, wins: 104, losses: 44, trend: "up" },
  { rank: 8, name: "IronClad", rating: 2543, wins: 98, losses: 47, trend: "same" },
];

const rankColor = (rank: number) => {
  if (rank === 1) return "text-warning";
  if (rank === 2) return "text-foreground/70";
  if (rank === 3) return "text-warning/60";
  return "text-muted-foreground";
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const Leaderboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 container mx-auto px-4">
        <div className="mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Global Rankings</p>
          <h1 className="font-display text-4xl font-bold text-foreground">Leaderboard</h1>
        </div>

        {/* Top 3 podium */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-2xl mx-auto">
          {[players[1], players[0], players[2]].map((p, i) => {
            const heights = ["h-28", "h-36", "h-24"];
            const isFirst = i === 1;
            return (
              <div key={p.rank} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${isFirst ? "bg-warning/20 ring-2 ring-warning" : "bg-muted"}`}>
                  {isFirst ? <Trophy className="h-5 w-5 text-warning" /> : <Medal className={`h-5 w-5 ${rankColor(p.rank)}`} />}
                </div>
                <p className="font-heading font-semibold text-foreground text-sm">{p.name}</p>
                <p className="font-display text-xs text-primary">{p.rating}</p>
                <div className={`${heights[i]} w-full mt-3 rounded-t-lg ${isFirst ? "gradient-primary" : "bg-secondary"}`} />
              </div>
            );
          })}
        </div>

        {/* Full table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-6 gap-4 p-4 border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
            <span>Rank</span><span className="col-span-2">Player</span><span>Rating</span><span>W/L</span><span>Trend</span>
          </div>
          {players.map((p) => (
            <div
              key={p.rank}
              className="grid grid-cols-6 gap-4 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors items-center"
            >
              <span className={`font-display font-bold ${rankColor(p.rank)}`}>#{p.rank}</span>
              <span className="col-span-2 font-heading font-semibold text-foreground">{p.name}</span>
              <span className="font-display text-primary font-bold">{p.rating}</span>
              <span className="text-sm text-muted-foreground">{p.wins}W / {p.losses}L</span>
              <TrendIcon trend={p.trend} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
