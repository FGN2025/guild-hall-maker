import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Swords } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ModeratorMatches = () => {
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: tournaments = [] } = useQuery({
    queryKey: ["mod-match-tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .in("status", ["open", "in_progress"])
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["mod-matches", selectedTournament],
    enabled: !!selectedTournament,
    queryFn: async () => {
      const { data: matchData, error } = await supabase
        .from("match_results")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });
      if (error) throw error;

      const playerIds = [
        ...new Set(
          (matchData ?? []).flatMap((m) => [m.player1_id, m.player2_id]).filter(Boolean) as string[]
        ),
      ];

      const { data: profiles } = playerIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, gamer_tag").in("user_id", playerIds)
        : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p.gamer_tag || p.display_name || "Unknown"])
      );

      return (matchData ?? []).map((m) => ({
        ...m,
        player1_name: m.player1_id ? profileMap.get(m.player1_id) ?? "Unknown" : "TBD",
        player2_name: m.player2_id ? profileMap.get(m.player2_id) ?? "Unknown" : "TBD",
      }));
    },
  });

  const [scores, setScores] = useState<Record<string, { p1: string; p2: string }>>({});

  const submitScore = async (matchId: string) => {
    const s = scores[matchId];
    if (!s) return;
    const p1 = parseInt(s.p1);
    const p2 = parseInt(s.p2);
    if (isNaN(p1) || isNaN(p2)) {
      toast.error("Enter valid scores");
      return;
    }

    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const winnerId = p1 > p2 ? match.player1_id : p2 > p1 ? match.player2_id : null;

    const { error } = await supabase
      .from("match_results")
      .update({
        player1_score: p1,
        player2_score: p2,
        winner_id: winnerId,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Advance winner to next round
    if (winnerId) {
      const nextRoundMatches = matches.filter((m) => m.round === match.round + 1);
      if (nextRoundMatches.length > 0) {
        const nextMatchIdx = Math.floor((match.match_number - 1) / 2);
        const nextMatch = nextRoundMatches[nextMatchIdx];
        if (nextMatch) {
          const isTopSlot = (match.match_number - 1) % 2 === 0;
          const updateField = isTopSlot ? { player1_id: winnerId } : { player2_id: winnerId };
          await supabase.from("match_results").update(updateField).eq("id", nextMatch.id);
        }
      }

      // Award season points
      const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
      await supabase.functions.invoke("award-season-points", {
        body: { winner_id: winnerId, loser_id: loserId },
      });
    }

    toast.success("Score submitted!");
    setScores((prev) => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["mod-matches", selectedTournament] });
  };

  const statusColor: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-400",
    in_progress: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-destructive/20 text-destructive",
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3 mb-8">
        <Swords className="h-8 w-8 text-primary" />
        Match Scoring
      </h1>

      <div className="mb-6">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[300px] bg-card border-border">
            <SelectValue placeholder="Select a tournament..." />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.status.replace("_", " ")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedTournament ? (
        <p className="text-muted-foreground font-body">Select a tournament to view and score matches.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : matches.length === 0 ? (
        <p className="text-muted-foreground font-body">No matches found. Generate a bracket from the tournament management page.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Player 1</TableHead>
                <TableHead>Player 2</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((m: any) => {
                const s = scores[m.id] ?? { p1: "", p2: "" };
                const isCompleted = m.status === "completed";
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">R{m.round}</TableCell>
                    <TableCell className="text-muted-foreground">M{m.match_number}</TableCell>
                    <TableCell className={m.winner_id === m.player1_id ? "text-primary font-medium" : ""}>
                      {m.player1_name}
                    </TableCell>
                    <TableCell className={m.winner_id === m.player2_id ? "text-primary font-medium" : ""}>
                      {m.player2_name}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[m.status] ?? ""}>{m.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {isCompleted ? (
                        <span className="font-mono text-sm">{m.player1_score} - {m.player2_score}</span>
                      ) : m.player1_id && m.player2_id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" min={0} className="w-14 h-8 text-center text-sm bg-card border-border"
                            value={s.p1} onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: { ...s, p1: e.target.value } }))}
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="number" min={0} className="w-14 h-8 text-center text-sm bg-card border-border"
                            value={s.p2} onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: { ...s, p2: e.target.value } }))}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isCompleted && m.player1_id && m.player2_id && (
                        <Button size="sm" onClick={() => submitScore(m.id)} disabled={!s.p1 || !s.p2}>
                          Submit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ModeratorMatches;
