import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, Target } from "lucide-react";
import PageBackground from "@/components/PageBackground";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import GameChallengeHero from "@/components/challenges/GameChallengeHero";
import GameBadgePanel from "@/components/challenges/GameBadgePanel";
import DifficultyFilter, { type DifficultyValue } from "@/components/challenges/DifficultyFilter";
import { useMyChallengeWindows } from "@/hooks/useChallengeWindow";
import { useChallengeHub } from "@/hooks/useChallengeHub";
import { getGameIdentity } from "@/lib/gameIdentity";

const GameChallenges = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { games, completedIds, isLoading } = useChallengeHub();
  const { data: challengeWindows = {} } = useMyChallengeWindows();
  const [difficulty, setDifficulty] = useState<DifficultyValue>("all");

  const game = games.find((g) => g.slug === slug);
  usePageTitle(game ? `${game.name} Challenges` : "Challenges");

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

  const counts = useMemo(() => {
    const c: Record<string, number> = { beginner: 0, intermediate: 0, advanced: 0 };
    (game?.challenges ?? []).forEach((ch) => {
      const d = (ch.difficulty || "beginner").toLowerCase();
      if (c[d] !== undefined) c[d] += 1;
    });
    return c;
  }, [game]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="py-20 text-center">
        <p className="font-body text-muted-foreground">This game has no challenges yet.</p>
        <Link to="/challenges" className="mt-2 inline-block text-primary hover:underline">
          Back to Challenges
        </Link>
      </div>
    );
  }

  const identity = getGameIdentity(game.slug, game.category);
  const inFilter = game.challenges.filter(
    (c) => difficulty === "all" || (c.difficulty || "beginner").toLowerCase() === difficulty
  );
  const active = inFilter.filter((c) => !completedIds.has(c.id));
  const done = inFilter.filter((c) => completedIds.has(c.id));

  return (
    <div style={{ ["--game-accent" as any]: identity.accent }}>
      <PageBackground pageSlug="challenges" />
      <div className="space-y-6">
        <Button
          asChild
          variant="outline"
          className="group w-fit gap-2 border-border bg-card/80 font-body text-muted-foreground backdrop-blur-sm transition-colors hover:border-[hsl(var(--game-accent))] hover:bg-card hover:text-[hsl(var(--game-accent))]"
        >
          <Link to="/challenges">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            All Game Communities
          </Link>
        </Button>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <GameChallengeHero
            name={game.name}
            category={game.category}
            slug={game.slug}
            description={game.description}
            platformTags={game.platformTags}
          />
          <GameBadgePanel gameName={game.name} completed={game.completed} total={game.total} />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
              <Target className="h-5 w-5" style={{ color: "hsl(var(--game-accent))" }} />
              {game.name} Challenges
            </h2>
            <p className="font-body text-sm text-muted-foreground">
              {user
                ? "Choose a challenge, complete the tasks and earn points."
                : "Browse the lineup — sign in to enroll and track progress."}
            </p>
          </div>
          <DifficultyFilter value={difficulty} onChange={setDifficulty} counts={counts} />
        </div>

        {inFilter.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="font-body text-muted-foreground">No challenges at this difficulty yet.</p>
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
                    windowLabel={challengeWindows[c.id]?.label ?? null}
                    windowOpen={challengeWindows[c.id]?.open}
                  />
                ))}
              </div>
            )}

            {done.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-400" /> Completed
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {done.map((c: any) => (
                    <ChallengeCard
                      key={c.id}
                      challenge={c}
                      enrollmentCount={(enrollmentCounts as any)[c.id] || 0}
                      windowLabel={challengeWindows[c.id]?.label ?? null}
                      windowOpen={challengeWindows[c.id]?.open}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameChallenges;
