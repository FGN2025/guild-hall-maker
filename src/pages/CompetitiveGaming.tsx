import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, Swords } from "lucide-react";
import PageBackground from "@/components/PageBackground";
import PointsWalletCard from "@/components/shared/PointsWalletCard";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import DifficultyFilter, { type DifficultyValue } from "@/components/challenges/DifficultyFilter";
import { useMyChallengeWindows } from "@/hooks/useChallengeWindow";
import { useChallengeHub } from "@/hooks/useChallengeHub";
import competitiveGamingBanner from "@/assets/challenges/competitive-gaming-banner.jpg";

const CompetitiveGaming = () => {
  usePageTitle("Competitive Gaming Challenges");
  const { user } = useAuth();
  const { competitive, completedIds, isLoading } = useChallengeHub();
  const { data: challengeWindows = {} } = useMyChallengeWindows();
  const [difficulty, setDifficulty] = useState<DifficultyValue>("all");
  const [gameFilter, setGameFilter] = useState<string | null>(null);

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["challenge-enrollment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenge_enrollments").select("challenge_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((e: any) => {
        counts[e.challenge_id] = (counts[e.challenge_id] || 0) + 1;
      });
      return counts;
    },
  });

  const gameNames = useMemo(
    () => [...new Set(competitive.map((c: any) => c.games?.name).filter(Boolean))].sort(),
    [competitive]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { beginner: 0, intermediate: 0, advanced: 0 };
    competitive.forEach((ch: any) => {
      const d = (ch.difficulty || "beginner").toLowerCase();
      if (c[d] !== undefined) c[d] += 1;
    });
    return c;
  }, [competitive]);

  const filtered = competitive.filter(
    (c: any) =>
      (difficulty === "all" || (c.difficulty || "beginner").toLowerCase() === difficulty) &&
      (!gameFilter || c.games?.name === gameFilter)
  );
  const active = filtered.filter((c) => !completedIds.has(c.id));
  const done = filtered.filter((c) => completedIds.has(c.id));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageBackground pageSlug="challenges" />
      <div className="space-y-6">
        <Button
          asChild
          variant="outline"
          className="group w-fit gap-2 border-border bg-card/80 font-body text-muted-foreground backdrop-blur-sm hover:text-foreground"
        >
          <Link to="/challenges">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            All Game Communities
          </Link>
        </Button>

        <div className="relative min-h-56 overflow-hidden rounded-2xl border border-primary/30 md:min-h-64">
          <img
            src={competitiveGamingBanner}
            alt="Competitive Gaming challenge arena"
            width={1536}
            height={640}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
          <div className="relative flex min-h-56 flex-col justify-end p-6 md:min-h-64 md:p-8">
            <h1 className="flex items-center gap-3 font-display text-3xl font-bold text-foreground md:text-4xl">
              <Swords className="h-8 w-8 text-primary" />
              Competitive Gaming
            </h1>
            <p className="mt-2 max-w-2xl font-body text-muted-foreground md:text-base">
              Standard game challenges outside the tournament format. Complete the tasks, submit your
              evidence and earn points.
            </p>
          </div>
        </div>

        {!user && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>{" "}
                to enroll and track your progress.
              </p>
            </CardContent>
          </Card>
        )}

        <PointsWalletCard compact />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {gameNames.length > 1 ? (
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
              <Badge
                variant={gameFilter === null ? "default" : "outline"}
                className={`cursor-pointer font-semibold ${gameFilter === null ? "" : "border border-white/40 bg-white/10 text-white hover:bg-white/20"}`}
                onClick={() => setGameFilter(null)}
              >
                All Games
              </Badge>
              {gameNames.map((name) => (
                <Badge
                  key={name as string}
                  variant={gameFilter === name ? "default" : "outline"}
                  className={`cursor-pointer font-semibold ${gameFilter === name ? "" : "border border-white/40 bg-white/10 text-white hover:bg-white/20"}`}
                  onClick={() => setGameFilter(name === gameFilter ? null : (name as string))}
                >
                  {name as string}
                </Badge>
              ))}
            </div>
          ) : (
            <div />
          )}
          <DifficultyFilter value={difficulty} onChange={setDifficulty} counts={counts} />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Swords className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
                Nothing here yet
              </h3>
              <p className="font-body text-muted-foreground">Check back soon for new challenges!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {active.map((c: any) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    enrollmentCount={(enrollmentCounts as any)[c.id] || 0}
                    windowLabel={(challengeWindows as any)[c.id]?.label ?? null}
                    windowOpen={(challengeWindows as any)[c.id]?.open}
                  />
                ))}
              </div>
            )}

            {done.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-400" /> Completed
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {done.map((c: any) => (
                    <ChallengeCard
                      key={c.id}
                      challenge={c}
                      enrollmentCount={(enrollmentCounts as any)[c.id] || 0}
                      windowLabel={(challengeWindows as any)[c.id]?.label ?? null}
                      windowOpen={(challengeWindows as any)[c.id]?.open}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CompetitiveGaming;
