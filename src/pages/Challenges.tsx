import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2, Clock, Flame } from "lucide-react";
import PageBackground from "@/components/PageBackground";

const Challenges = () => {
  const { user } = useAuth();

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["player-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["player-challenge-completions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_completions")
        .select("challenge_id, completed_at, awarded_points")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedIds = new Set(completions.map((c: any) => c.challenge_id));

  const activeChallenges = challenges.filter((c: any) => !completedIds.has(c.id));
  const completedChallenges = challenges.filter((c: any) => completedIds.has(c.id));

  const typeIcon = (type: string) => {
    switch (type) {
      case "daily": return <Flame className="h-4 w-4 text-orange-400" />;
      case "weekly": return <Clock className="h-4 w-4 text-blue-400" />;
      default: return <Target className="h-4 w-4 text-primary" />;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      default: return "One-Time";
    }
  };

  const isExpired = (c: any) => c.end_date && new Date(c.end_date) < new Date();

  return (
    <>
      <PageBackground pageSlug="challenges" />
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Challenges
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            Complete challenges to earn bonus points and rewards.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-primary">{challenges.length}</p>
              <p className="text-xs text-muted-foreground">Total Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-green-400">{completedChallenges.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-foreground">{activeChallenges.length}</p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-accent-foreground">
                {completions.reduce((sum: number, c: any) => sum + (c.awarded_points || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Points Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {challenges.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-body">Overall Progress</span>
              <span className="font-mono text-foreground">
                {completedChallenges.length} / {challenges.length}
              </span>
            </div>
            <Progress
              value={challenges.length > 0 ? (completedChallenges.length / challenges.length) * 100 : 0}
              className="h-3"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : challenges.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">No Active Challenges</h3>
              <p className="text-muted-foreground font-body">Check back soon for new challenges!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active challenges */}
            {activeChallenges.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-foreground">Active Challenges</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeChallenges.map((c: any) => (
                    <Card key={c.id} className={`transition-colors ${isExpired(c) ? "opacity-50" : "hover:border-primary/40"}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {typeIcon(c.challenge_type)}
                            <Badge variant="outline" className="text-xs">{typeLabel(c.challenge_type)}</Badge>
                          </div>
                          <Badge variant="secondary" className="font-mono text-sm">
                            +{c.points_reward} pts
                          </Badge>
                        </div>
                        <h3 className="font-display font-semibold text-foreground mb-1">{c.name}</h3>
                        {c.description && (
                          <p className="text-sm text-muted-foreground font-body line-clamp-2">{c.description}</p>
                        )}
                        {(c.start_date || c.end_date) && (
                          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {c.start_date && <span>{new Date(c.start_date).toLocaleDateString()}</span>}
                            {c.start_date && c.end_date && <span>→</span>}
                            {c.end_date && <span>{new Date(c.end_date).toLocaleDateString()}</span>}
                            {isExpired(c) && <Badge variant="destructive" className="text-xs ml-2">Expired</Badge>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completed challenges */}
            {completedChallenges.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Completed
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedChallenges.map((c: any) => {
                    const completion = completions.find((comp: any) => comp.challenge_id === c.id);
                    return (
                      <Card key={c.id} className="border-green-500/20 bg-green-500/5">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                              <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                                {typeLabel(c.challenge_type)}
                              </Badge>
                            </div>
                            <Badge className="bg-green-500/20 text-green-400 font-mono text-sm">
                              +{completion?.awarded_points || c.points_reward} pts
                            </Badge>
                          </div>
                          <h3 className="font-display font-semibold text-foreground mb-1">{c.name}</h3>
                          {c.description && (
                            <p className="text-sm text-muted-foreground font-body line-clamp-2">{c.description}</p>
                          )}
                          {completion?.completed_at && (
                            <p className="text-xs text-green-400/70 mt-3">
                              Completed {new Date(completion.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
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
