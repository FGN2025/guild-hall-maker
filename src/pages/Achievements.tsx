import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayerAchievements } from "@/hooks/usePlayerAchievements";
import PlayerAchievements from "@/components/player/PlayerAchievements";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Award, RefreshCw } from "lucide-react";
import PageHero from "@/components/PageHero";
import PageBackground from "@/components/PageBackground";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const Achievements = () => {
  usePageTitle("My Achievements");
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: achievements, isLoading } = usePlayerAchievements(userId);
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  // Check if user has a linked Steam account
  const { data: profile } = useQuery({
    queryKey: ["profile-steam", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("steam_id")
        .eq("user_id", userId!)
        .single();
      return data;
    },
  });

  const hasSteam = !!profile?.steam_id;

  const handleSyncSteam = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("steam-achievement-sync");
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Sync Issue", description: data.error, variant: "destructive" });
      } else {
        const msg = `Synced ${data.synced} achievements across ${data.games_checked} games.` +
          (data.private_games?.length ? ` ${data.private_games.length} game(s) skipped (private profile).` : "");
        toast({ title: "Steam Sync Complete", description: msg });
        queryClient.invalidateQueries({ queryKey: ["player-achievements"] });
      }
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const unlocked = achievements?.filter((a) => a.unlocked).length ?? 0;
  const total = achievements?.length ?? 0;

  return (
    <>
      <PageBackground pageSlug="achievements" />
      <div className="space-y-6 relative z-10">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pb-4">
          <PageHero pageSlug="achievements" />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2 page-heading">
                Trophy Room
              </p>
              <h1 className="font-display text-4xl font-bold text-foreground page-heading">
                My Achievements
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {hasSteam && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncSteam}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing…" : "Sync Steam"}
                </Button>
              )}
              {!isLoading && total > 0 && (
                <span className="text-sm font-display text-muted-foreground">
                  {unlocked}/{total} unlocked
                </span>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-1 w-full mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !achievements || achievements.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg text-foreground mb-2">No achievements yet</h3>
            <p className="text-sm text-muted-foreground font-body">
              Start competing in tournaments and challenges to earn achievements!
            </p>
          </div>
        ) : (
          <PlayerAchievements achievements={achievements} />
        )}
      </div>
    </>
  );
};

export default Achievements;
