import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Compass, CheckCircle2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageBackground from "@/components/PageBackground";
import QuestCard from "@/components/quests/QuestCard";
import QuestChainCard from "@/components/quests/QuestChainCard";
import QuestRankBadge from "@/components/quests/QuestRankBadge";
import { useQuestChains } from "@/hooks/useQuestChains";
import { usePlayerQuestXP } from "@/hooks/usePlayerQuestXP";
import PointsWalletCard from "@/components/shared/PointsWalletCard";

const Quests = () => {
  usePageTitle("Quests");
  const { user } = useAuth();
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const { chains, completedQuestIds } = useQuestChains();
  const { totalXP, rankInfo } = usePlayerQuestXP();

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["player-quests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*, games(name, slug, cover_image_url, category)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["quest-enrollment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_enrollments")
        .select("quest_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((e: any) => {
        counts[e.quest_id] = (counts[e.quest_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ["my-quest-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_enrollments")
        .select("quest_id, status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedIds = new Set(myEnrollments.filter((e: any) => e.status === "completed").map((e: any) => e.quest_id));
  const enrolledIds = new Set(myEnrollments.map((e: any) => e.quest_id));

  const gameNames = [...new Set(quests.map((q: any) => q.games?.name).filter(Boolean))].sort();

  const filtered = gameFilter
    ? quests.filter((q: any) => q.games?.name === gameFilter)
    : quests;

  // Standalone quests (not part of a chain)
  const standaloneQuests = filtered.filter((q: any) => !q.chain_id);
  const activeQuests = standaloneQuests.filter((q: any) => !completedIds.has(q.id));
  const completedQuests = standaloneQuests.filter((q: any) => completedIds.has(q.id));

  // Active chains with quests
  const activeChains = chains.filter((c: any) => c.totalCount > 0);

  return (
    <>
      <PageBackground pageSlug="quests" />
      <div className="space-y-6">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3 page-heading">
                <Compass className="h-8 w-8 text-primary" />
                Quests
              </h1>
              <p className="text-muted-foreground font-body mt-1 page-heading">
                Complete quests to earn points and XP. Chain quests together for bonus rewards.
              </p>
            </div>
            {user && totalXP > 0 && (
              <div className="flex-shrink-0">
                <QuestRankBadge totalXP={totalXP} />
              </div>
            )}
          </div>
        </div>

        {user ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-primary">{quests.length}</p>
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
                    {quests.length > 0 ? Math.round((completedIds.size / quests.length) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-primary">{totalXP}</p>
                  <p className="text-xs text-muted-foreground">Quest XP</p>
                </CardContent>
              </Card>
            </div>

            {quests.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-body">Overall Progress</span>
                  <span className="font-mono text-foreground">{completedIds.size} / {quests.length}</span>
                </div>
                <Progress value={quests.length > 0 ? (completedIds.size / quests.length) * 100 : 0} className="h-3" />
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link> to track your progress and enroll in quests.
              </p>
            </CardContent>
          </Card>
        )}

        <PointsWalletCard compact />

        {gameNames.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant={gameFilter === null ? "default" : "outline"} className={`cursor-pointer font-semibold ${gameFilter === null ? "" : "text-white bg-card/70 border-white/30 hover:bg-card/90"}`} onClick={() => setGameFilter(null)}>
              All Games
            </Badge>
            {gameNames.map((name) => (
              <Badge key={name} variant={gameFilter === name ? "default" : "outline"} className={`cursor-pointer font-semibold ${gameFilter === name ? "" : "text-white bg-card/70 border-white/30 hover:bg-card/90"}`} onClick={() => setGameFilter(name === gameFilter ? null : name)}>
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
        ) : quests.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Compass className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">No Quests Available</h3>
              <p className="text-muted-foreground font-body">Check back soon for new quests!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Quest Chains */}
            {activeChains.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Quest Chains
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeChains.map((chain: any) => (
                    <QuestChainCard key={chain.id} chain={chain} />
                  ))}
                </div>
              </div>
            )}

            {activeQuests.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-white">Available Quests</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeQuests.map((q: any) => (
                    <QuestCard key={q.id} quest={q} enrollmentCount={(enrollmentCounts as any)[q.id] || 0} />
                  ))}
                </div>
              </div>
            )}

            {completedQuests.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Completed
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedQuests.map((q: any) => (
                    <QuestCard key={q.id} quest={q} enrollmentCount={(enrollmentCounts as any)[q.id] || 0} />
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

export default Quests;
