import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import PlayerSelector from "@/components/compare/PlayerSelector";
import ComparisonStatRow from "@/components/compare/ComparisonStatRow";
import ComparisonChart from "@/components/compare/ComparisonChart";
import HeadToHeadHistory from "@/components/compare/HeadToHeadHistory";
import GameBreakdownTable from "@/components/compare/GameBreakdownTable";
import { useAllPlayers, usePlayerComparisonData } from "@/hooks/usePlayerComparison";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Swords, Trophy, Target, TrendingUp, Calendar, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const PlayerComparison = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: players, isLoading: loadingPlayers } = useAllPlayers();

  const playerAId = searchParams.get("a");
  const playerBId = searchParams.get("b");

  const setPlayerAId = useCallback((id: string) => {
    setSearchParams((prev) => { prev.set("a", id); return prev; }, { replace: true });
  }, [setSearchParams]);

  const setPlayerBId = useCallback((id: string) => {
    setSearchParams((prev) => { prev.set("b", id); return prev; }, { replace: true });
  }, [setSearchParams]);

  const { data: playerA, isLoading: loadingA } = usePlayerComparisonData(playerAId);
  const { data: playerB, isLoading: loadingB } = usePlayerComparisonData(playerBId);

  const isLoading = loadingA || loadingB;
  const bothSelected = playerA && playerB;

  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="py-8 container mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Head to Head</p>
          <h1 className="font-display text-4xl font-bold text-foreground">Player Comparison</h1>
        </div>

        {/* Player Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <PlayerSelector
              label="Player 1"
              players={players ?? []}
              selectedId={playerAId}
              onSelect={setPlayerAId}
              excludeId={playerBId}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <PlayerSelector
              label="Player 2"
              players={players ?? []}
              selectedId={playerBId}
              onSelect={setPlayerBId}
              excludeId={playerAId}
            />
          </div>
        </div>

        {loadingPlayers && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {isLoading && (playerAId || playerBId) && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {bothSelected && (
          <>
            {/* VS Header */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src={playerA.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-display font-bold">
                    {playerA.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-display text-lg font-bold text-foreground">{playerA.display_name}</span>
            </div>

            {/* Share Button */}
            <div className="flex justify-center mb-8">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied!", description: "Share this URL to show this comparison." });
                }}
              >
                <Link2 className="h-4 w-4" />
                Copy Share Link
              </Button>
            </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/30">
                <Swords className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-foreground">{playerB.display_name}</span>
                <Avatar className="h-12 w-12 border-2 border-destructive">
                  <AvatarImage src={playerB.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-destructive/10 text-destructive font-display font-bold">
                    {playerB.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Stats Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4 text-center flex items-center justify-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Career Stats
                </h3>
                <ComparisonStatRow label="Points" valueA={playerA.totals.points} valueB={playerB.totals.points} />
                <ComparisonStatRow label="Wins" valueA={playerA.totals.wins} valueB={playerB.totals.wins} />
                <ComparisonStatRow label="Losses" valueA={playerA.totals.losses} valueB={playerB.totals.losses} highlightHigher={false} />
                <ComparisonStatRow label="Win Rate" valueA={playerA.totals.winRate} valueB={playerB.totals.winRate} suffix="%" />
                <ComparisonStatRow label="Tournaments" valueA={playerA.totals.tournaments_played} valueB={playerB.totals.tournaments_played} />
                <ComparisonStatRow label="Seasons" valueA={playerA.totals.seasonsPlayed} valueB={playerB.totals.seasonsPlayed} />
              </div>

              <ComparisonChart playerA={playerA} playerB={playerB} playerAId={playerAId} playerBId={playerBId} />
            </div>

            {/* Season-by-Season Breakdown */}
            {(() => {
              const allSeasonIds = new Set([
                ...playerA.seasons.map((s) => s.season_id),
                ...playerB.seasons.map((s) => s.season_id),
              ]);
              if (allSeasonIds.size === 0) return null;

              const seasonData = Array.from(allSeasonIds).map((sid) => {
                const a = playerA.seasons.find((s) => s.season_id === sid);
                const b = playerB.seasons.find((s) => s.season_id === sid);
                return { season_name: a?.season_name || b?.season_name || "Unknown", a, b };
              });

              return (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Season Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                          <th className="text-left py-3 px-2">Season</th>
                          <th className="text-center py-3 px-2 text-primary">{playerA.display_name} Pts</th>
                          <th className="text-center py-3 px-2 text-primary">{playerA.display_name} W/L</th>
                          <th className="text-center py-3 px-2 text-destructive">{playerB.display_name} Pts</th>
                          <th className="text-center py-3 px-2 text-destructive">{playerB.display_name} W/L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seasonData.map((row) => (
                          <tr key={row.season_name} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-2 font-heading text-foreground">{row.season_name}</td>
                            <td className="py-3 px-2 text-center font-display font-bold text-primary">
                              {row.a?.points ?? "—"}
                            </td>
                            <td className="py-3 px-2 text-center font-display text-muted-foreground">
                              {row.a ? `${row.a.wins}/${row.a.losses}` : "—"}
                            </td>
                            <td className="py-3 px-2 text-center font-display font-bold text-destructive">
                              {row.b?.points ?? "—"}
                            </td>
                            <td className="py-3 px-2 text-center font-display text-muted-foreground">
                              {row.b ? `${row.b.wins}/${row.b.losses}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Per-Game Breakdown */}
            <GameBreakdownTable
              playerAId={playerAId}
              playerBId={playerBId}
              playerAName={playerA.display_name}
              playerBName={playerB.display_name}
            />

            {/* Head-to-Head Match History */}
            <div className="mt-8">
              <HeadToHeadHistory playerA={playerA} playerB={playerB} />
            </div>
          </>
        )}

        {!bothSelected && !loadingPlayers && !isLoading && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="font-heading text-lg text-foreground mb-2">Select Two Players</h3>
            <p className="text-sm text-muted-foreground font-body">
              Choose two players above to compare their seasonal stats side by side.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerComparison;
