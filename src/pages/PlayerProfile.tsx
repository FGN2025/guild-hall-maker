import { useParams, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { usePlayerAchievements } from "@/hooks/usePlayerAchievements";
import { usePlayerGameBreakdown } from "@/hooks/usePlayerGameBreakdown";
import PlayerProfileHeader from "@/components/player/PlayerProfileHeader";
import PlayerStatsGrid from "@/components/player/PlayerStatsGrid";
import MatchHistoryTable from "@/components/player/MatchHistoryTable";
import HeadToHeadList from "@/components/player/HeadToHeadList";
import RankProgressionChart from "@/components/player/RankProgressionChart";
import PlayerAchievements from "@/components/player/PlayerAchievements";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Gamepad2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PlayerProfile = () => {
  usePageTitle("Player Profile");
  const { id } = useParams<{ id: string }>();
  const { profile, stats, matchHistory, headToHead, rankProgression, isLoading } = usePlayerProfile(id);
  const { data: achievements, isLoading: achievementsLoading } = usePlayerAchievements(id);
  const { data: gameBreakdown } = usePlayerGameBreakdown(id);

  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="py-8 container mx-auto px-4 max-w-5xl">
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors font-body text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leaderboard
        </Link>

        {isLoading ? (
          <div className="space-y-8">
            {/* Profile header skeleton */}
            <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-6 animate-pulse">
              <Skeleton className="h-20 w-20 rounded-full shrink-0" />
              <div className="space-y-3 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
            {/* Stats grid skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        ) : !profile ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg text-foreground mb-2">Player not found</h3>
            <p className="text-sm text-muted-foreground font-body">
              This player profile doesn't exist or has been removed.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <PlayerProfileHeader profile={profile} stats={stats} />
            <PlayerStatsGrid stats={stats} />

            {achievements && achievements.length > 0 && (
              <PlayerAchievements achievements={achievements} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RankProgressionChart data={rankProgression ?? []} />
              <HeadToHeadList records={headToHead ?? []} />
            </div>

            {/* Per-game breakdown */}
            {gameBreakdown && gameBreakdown.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                  Stats by Game
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {gameBreakdown.map((g) => (
                    <AccordionItem key={g.game_name} value={g.game_name}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="font-heading font-semibold text-foreground">{g.game_name}</span>
                          <Badge variant="outline" className="text-xs">{g.category}</Badge>
                          <span className="text-xs text-muted-foreground">{g.matches} matches</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground font-heading uppercase">Wins</p>
                            <p className="font-display text-xl font-bold text-green-500">{g.wins}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground font-heading uppercase">Losses</p>
                            <p className="font-display text-xl font-bold text-destructive">{g.losses}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground font-heading uppercase">Win Rate</p>
                            <p className="font-display text-xl font-bold text-primary">{g.win_rate}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground font-heading uppercase">Tournaments</p>
                            <p className="font-display text-xl font-bold text-foreground">{g.tournaments_played}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            <MatchHistoryTable matches={matchHistory ?? []} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;
