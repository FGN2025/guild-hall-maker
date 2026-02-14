import Navbar from "@/components/Navbar";
import { Trophy, Medal, TrendingUp, Minus, Swords, Crown } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const rankColor = (rank: number) => {
  if (rank === 1) return "text-warning";
  if (rank === 2) return "text-foreground/70";
  if (rank === 3) return "text-warning/60";
  return "text-muted-foreground";
};

const rankBg = (rank: number) => {
  if (rank === 1) return "bg-warning/20 ring-2 ring-warning";
  if (rank === 2) return "bg-foreground/10 ring-2 ring-foreground/30";
  if (rank === 3) return "bg-warning/10 ring-2 ring-warning/30";
  return "bg-muted";
};

const Leaderboard = () => {
  const { data: players, isLoading } = useLeaderboard();

  const topThree = players?.slice(0, 3) ?? [];
  const podiumOrder = topThree.length === 3
    ? [topThree[1], topThree[0], topThree[2]]
    : topThree;

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 container mx-auto px-4">
        <div className="mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Global Rankings</p>
          <h1 className="font-display text-4xl font-bold text-foreground">Leaderboard</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !players || players.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg text-foreground mb-2">No rankings yet</h3>
            <p className="text-sm text-muted-foreground font-body">
              Rankings will appear once match results are recorded.
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {topThree.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-10 max-w-2xl mx-auto">
                {podiumOrder.map((p, i) => {
                  const heights = ["h-28", "h-36", "h-24"];
                  const isFirst = p.rank === 1;
                  return (
                    <div key={p.user_id} className="flex flex-col items-center animate-fade-in">
                      <Avatar className={`w-12 h-12 mb-2 ${rankBg(p.rank)}`}>
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-heading text-sm">
                          {p.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-heading font-semibold text-foreground text-sm text-center truncate max-w-[120px]">
                        {p.display_name}
                      </p>
                      <p className="font-display text-xs text-primary">{p.win_rate}% WR</p>
                      <p className="text-[10px] text-muted-foreground font-body">
                        {p.wins}W / {p.losses}L / {p.draws}D
                      </p>
                      <div
                        className={`${heights[i]} w-full mt-3 rounded-t-lg flex items-start justify-center pt-2 ${
                          isFirst ? "gradient-primary" : "bg-secondary"
                        }`}
                      >
                        {isFirst ? (
                          <Crown className="h-5 w-5 text-primary-foreground" />
                        ) : (
                          <Medal className={`h-5 w-5 ${rankColor(p.rank)}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-4 border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                <span className="col-span-1">Rank</span>
                <span className="col-span-3">Player</span>
                <span className="col-span-2">Win Rate</span>
                <span className="col-span-2 text-center">Matches</span>
                <span className="col-span-1 text-center">W</span>
                <span className="col-span-1 text-center">L</span>
                <span className="col-span-1 text-center">D</span>
                <span className="col-span-1" />
              </div>
              {players.map((p) => (
                <div
                  key={p.user_id}
                  className="grid grid-cols-12 gap-2 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors items-center animate-fade-in"
                >
                  {/* Rank */}
                  <span className={`col-span-1 font-display font-bold text-lg ${rankColor(p.rank)}`}>
                    #{p.rank}
                  </span>

                  {/* Player */}
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
                        {p.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-heading font-semibold text-foreground text-sm truncate">
                      {p.display_name}
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Progress value={p.win_rate} className="h-1.5 flex-1 bg-muted" />
                    <span className="font-display text-xs text-primary font-bold w-10 text-right">
                      {p.win_rate}%
                    </span>
                  </div>

                  {/* Matches */}
                  <span className="col-span-2 font-body text-sm text-muted-foreground text-center">
                    {p.total_matches}
                  </span>

                  {/* W */}
                  <span className="col-span-1 font-display text-sm text-success font-bold text-center">
                    {p.wins}
                  </span>

                  {/* L */}
                  <span className="col-span-1 font-display text-sm text-destructive font-bold text-center">
                    {p.losses}
                  </span>

                  {/* D */}
                  <span className="col-span-1 font-display text-sm text-warning font-bold text-center">
                    {p.draws}
                  </span>

                  {/* Visual indicator */}
                  <div className="col-span-1 flex justify-end">
                    {p.rank <= 3 ? (
                      <Trophy className={`h-4 w-4 ${rankColor(p.rank)}`} />
                    ) : p.win_rate >= 50 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
