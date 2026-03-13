import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Swords, Users, Trophy, ChevronRight, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import PageBackground from "@/components/PageBackground";
import { useState } from "react";

interface Ladder {
  id: string;
  name: string;
  description: string | null;
  game_id: string | null;
  is_active: boolean;
}

interface LadderEntry {
  id: string;
  user_id: string;
  rating: number;
  wins: number;
  losses: number;
  rank: number | null;
  display_name?: string;
  gamer_tag?: string | null;
  avatar_url?: string | null;
}

const Ladders = () => {
  usePageTitle("Ladders");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLadderId, setSelectedLadderId] = useState<string | null>(null);

  const { data: ladders = [], isLoading } = useQuery({
    queryKey: ["ladders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ladders")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Ladder[];
    },
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["ladder-entries", selectedLadderId],
    enabled: !!selectedLadderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ladder_entries")
        .select("*")
        .eq("ladder_id", selectedLadderId!)
        .order("rating", { ascending: false });
      if (error) throw error;

      const userIds = (data ?? []).map((e) => e.user_id);
      const { data: profiles } =
        userIds.length > 0
          ? await supabase
              .from("profiles")
              .select("user_id, display_name, gamer_tag, avatar_url")
              .in("user_id", userIds)
          : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      return (data ?? []).map((e, i) => {
        const profile = profileMap.get(e.user_id);
        return {
          ...e,
          rank: i + 1,
          display_name: profile?.gamer_tag || profile?.display_name || "Unknown",
          gamer_tag: profile?.gamer_tag,
          avatar_url: profile?.avatar_url,
        } as LadderEntry;
      });
    },
  });

  const isJoined = entries.some((e) => e.user_id === user?.id);

  const joinMutation = useMutation({
    mutationFn: async (ladderId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("ladder_entries").insert({
        ladder_id: ladderId,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ladder-entries", selectedLadderId] });
      toast.success("You've joined the ladder!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedLadder = ladders.find((l) => l.id === selectedLadderId);

  return (
    <>
      <PageBackground pageSlug="ladders" />
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Swords className="h-8 w-8 text-primary" />
            Ranked Ladders
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            Climb the ranks and prove your skill.
          </p>
        </div>

        {selectedLadderId && selectedLadder ? (
          <div className="space-y-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLadderId(null)}
              className="text-muted-foreground"
            >
              ← Back to Ladders
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {selectedLadder.name}
                </h2>
                {selectedLadder.description && (
                  <p className="text-muted-foreground font-body text-sm mt-1">
                    {selectedLadder.description}
                  </p>
                )}
              </div>
              {!isJoined && (
                <Button
                  onClick={() => joinMutation.mutate(selectedLadderId)}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? "Joining..." : "Join Ladder"}
                </Button>
              )}
              {isJoined && (
                <Badge variant="secondary">Joined</Badge>
              )}
            </div>

            {entriesLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : entries.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    No Players Yet
                  </h3>
                  <p className="text-muted-foreground font-body">
                    Be the first to join this ladder!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const isMe = entry.user_id === user?.id;
                  return (
                    <Card
                      key={entry.id}
                      className={isMe ? "border-primary/40 bg-primary/5" : ""}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <span className="font-mono text-lg font-bold text-muted-foreground w-8 text-center">
                          {entry.rank}
                        </span>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={entry.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {(entry.display_name ?? "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {entry.display_name}
                            {isMe && (
                              <span className="text-xs text-primary ml-2">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.wins}W – {entry.losses}L
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-4 w-4 text-primary" />
                          <span className="font-mono font-bold text-foreground">
                            {entry.rating}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : ladders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    No Ladders Available
                  </h3>
                  <p className="text-muted-foreground font-body">
                    Check back soon for ranked ladders!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {ladders.map((ladder) => (
                  <Card
                    key={ladder.id}
                    className="cursor-pointer hover:border-primary/40 transition-colors glow-card"
                    onClick={() => setSelectedLadderId(ladder.id)}
                  >
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <Swords className="h-6 w-6 text-primary shrink-0" />
                        <h3 className="font-display font-semibold text-foreground text-lg">
                          {ladder.name}
                        </h3>
                      </div>
                      {ladder.description && (
                        <p className="text-sm text-muted-foreground font-body mb-4 flex-1">
                          {ladder.description}
                        </p>
                      )}
                      <div className="flex items-center justify-end mt-auto pt-3 border-t border-border">
                        <span className="text-sm text-primary flex items-center gap-1">
                          View Rankings <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Ladders;
