import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageBackground from "@/components/PageBackground";
import ChallengeCard from "@/components/challenges/ChallengeCard";

const Challenges = () => {
  usePageTitle("Challenges");
  const { user } = useAuth();
  const [gameFilter, setGameFilter] = useState<string | null>(null);

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["player-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*, games(name, slug, cover_image_url, category)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["challenge-enrollment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_enrollments")
        .select("challenge_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((e: any) => {
        counts[e.challenge_id] = (counts[e.challenge_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ["my-challenge-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_enrollments")
        .select("challenge_id, status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedIds = new Set(myEnrollments.filter((e: any) => e.status === "completed").map((e: any) => e.challenge_id));
  const enrolledIds = new Set(myEnrollments.map((e: any) => e.challenge_id));

  // Get unique game names for filter tabs
  const gameNames = [...new Set(challenges.map((c: any) => c.games?.name).filter(Boolean))].sort();

  const filtered = gameFilter
    ? challenges.filter((c: any) => c.games?.name === gameFilter)
    : challenges;

  const activeChallenges = filtered.filter((c: any) => !completedIds.has(c.id));
  const completedChallenges = filtered.filter((c: any) => completedIds.has(c.id));

  return (
    <>
      <PageBackground pageSlug="challenges" />
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Challenges
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            Complete challenges to earn points. Upload evidence to prove completion.
          </p>
        </div>

        {/* Stats bar */}
        {user ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-primary">{challenges.length}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-foreground">{enrolledIds.size}</p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-green-400">{completedIds.size}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-accent-foreground">
                    {challenges.length > 0
                      ? Math.round((completedIds.size / challenges.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress bar */}
            {challenges.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-body">Overall Progress</span>
                  <span className="font-mono text-foreground">{completedIds.size} / {challenges.length}</span>
                </div>
                <Progress
                  value={challenges.length > 0 ? (completedIds.size / challenges.length) * 100 : 0}
                  className="h-3"
                />
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link> to track your progress and enroll in challenges.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Game filter tabs */}
        {gameNames.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={gameFilter === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setGameFilter(null)}
            >
              All Games
            </Badge>
            {gameNames.map((name) => (
              <Badge
                key={name}
                variant={gameFilter === name ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setGameFilter(name === gameFilter ? null : name)}
              >
                {name}
              </Badge>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
                <Skeleton className="h-40 w-full rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">No Work Orders Available</h3>
              <p className="text-muted-foreground font-body">Check back soon for new work orders!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {activeChallenges.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-foreground">Available Work Orders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeChallenges.map((c: any) => (
                    <ChallengeCard
                      key={c.id}
                      challenge={c}
                      enrollmentCount={(enrollmentCounts as any)[c.id] || 0}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedChallenges.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Completed
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedChallenges.map((c: any) => (
                    <ChallengeCard
                      key={c.id}
                      challenge={c}
                      enrollmentCount={(enrollmentCounts as any)[c.id] || 0}
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

export default Challenges;
