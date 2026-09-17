import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Search, ListFilter } from "lucide-react";
import PageBackground from "@/components/PageBackground";
import PointsWalletCard from "@/components/shared/PointsWalletCard";
import GameTile from "@/components/challenges/GameTile";
import CompetitiveGamingTile from "@/components/challenges/CompetitiveGamingTile";
import { useChallengeHub } from "@/hooks/useChallengeHub";

const ChallengesHub = () => {
  usePageTitle("Challenges");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const { games, challenges, competitive, competitiveCompleted, completedIds, enrolledIds, isLoading } =
    useChallengeHub();

  // Legacy ?game=Name links land on that game's community page.
  const legacyGame = searchParams.get("game");
  useEffect(() => {
    if (!legacyGame || isLoading) return;
    const match = games.find((g) => g.name === legacyGame);
    navigate(match ? `/challenges/game/${match.slug}` : "/challenges", { replace: true });
  }, [legacyGame, games, isLoading, navigate]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (g) => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
    );
  }, [games, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    visible.forEach((g) => {
      const list = map.get(g.category) ?? [];
      list.push(g);
      map.set(g.category, list);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [visible]);

  const totalCompleted = completedIds.size;

  return (
    <>
      <PageBackground pageSlug="challenges" />
      <div className="space-y-6">
        <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pb-4 backdrop-blur-sm md:-mx-6 md:px-6">
          <h1 className="page-heading flex items-center gap-3 font-display text-3xl font-bold text-foreground">
            <Target className="h-8 w-8 text-primary" />
            Challenges
          </h1>
          <p className="page-heading mt-1 font-body text-muted-foreground">
            Pick your game community, earn points and work toward badges.
          </p>
        </div>

        {user ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="font-mono text-2xl font-bold text-primary">{games.length}</p>
                <p className="text-xs text-muted-foreground">Game Communities</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="font-mono text-2xl font-bold text-foreground">{challenges.length}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="font-mono text-2xl font-bold text-foreground">{enrolledIds.size}</p>
                <p className="text-xs text-muted-foreground">Enrolled</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="font-mono text-2xl font-bold text-green-400">{totalCompleted}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>{" "}
                to track your progress and enroll in challenges.
              </p>
            </CardContent>
          </Card>
        )}

        <PointsWalletCard compact />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search game communities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-card pl-10 font-body"
            />
          </div>
          <Link
            to="/challenges/all"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ListFilter className="h-4 w-4" /> Show all challenges
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Target className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-1 font-display text-lg font-semibold text-foreground">No Challenges Available</h3>
              <p className="font-body text-muted-foreground">Check back soon for new challenges!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {competitive.length > 0 && !search.trim() && (
              <section className="space-y-3">
                <h2 className="neon-text font-display text-xl font-bold text-white">Competitive Gaming</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <CompetitiveGamingTile
                    total={competitive.length}
                    completed={competitiveCompleted}
                    showProgress={!!user}
                  />
                </div>
              </section>
            )}
            {grouped.map(([category, list]) => (
              <section key={category} className="space-y-3">
                <h2 className="neon-text font-display text-xl font-bold text-white">{category}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((g) => (
                    <GameTile key={g.slug} game={g} showProgress={!!user} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ChallengesHub;
