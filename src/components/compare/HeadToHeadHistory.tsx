import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Minus } from "lucide-react";
import { format } from "date-fns";
import type { PlayerComparisonData } from "@/hooks/usePlayerComparison";

interface HeadToHeadHistoryProps {
  playerA: PlayerComparisonData;
  playerB: PlayerComparisonData;
}

const HeadToHeadHistory = ({ playerA, playerB }: HeadToHeadHistoryProps) => {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["head-to-head", playerA.user_id, playerB.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_results")
        .select("id, player1_id, player2_id, player1_score, player2_score, winner_id, status, completed_at, round, tournament_id, tournaments(name)")
        .or(
          `and(player1_id.eq.${playerA.user_id},player2_id.eq.${playerB.user_id}),and(player1_id.eq.${playerB.user_id},player2_id.eq.${playerA.user_id})`
        )
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      return data ?? [];
    },
  });

  const aWins = matches?.filter((m) => m.winner_id === playerA.user_id).length ?? 0;
  const bWins = matches?.filter((m) => m.winner_id === playerB.user_id).length ?? 0;
  const total = matches?.length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        Head-to-Head Record
      </h3>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!isLoading && total === 0 && (
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <Minus className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm font-body">No direct matchups found between these players.</p>
        </div>
      )}

      {!isLoading && total > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-3 mb-6">
            <span className="font-display text-sm font-bold text-primary">{playerA.display_name}</span>
            <div className="flex-1 flex items-center h-8 rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary/80 flex items-center justify-center text-xs font-display font-bold text-primary-foreground transition-all"
                style={{ width: `${total > 0 ? (aWins / total) * 100 : 50}%`, minWidth: aWins > 0 ? "2rem" : 0 }}
              >
                {aWins > 0 && aWins}
              </div>
              <div
                className="h-full bg-destructive/80 flex items-center justify-center text-xs font-display font-bold text-destructive-foreground transition-all"
                style={{ width: `${total > 0 ? (bWins / total) * 100 : 50}%`, minWidth: bWins > 0 ? "2rem" : 0 }}
              >
                {bWins > 0 && bWins}
              </div>
            </div>
            <span className="font-display text-sm font-bold text-destructive">{playerB.display_name}</span>
          </div>

          {/* Match list */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Tournament</th>
                  <th className="text-center py-3 px-2">Round</th>
                  <th className="text-center py-3 px-2">Score</th>
                  <th className="text-center py-3 px-2">Winner</th>
                  <th className="text-right py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {matches?.map((m) => {
                  const aIsP1 = m.player1_id === playerA.user_id;
                  const scoreA = aIsP1 ? m.player1_score : m.player2_score;
                  const scoreB = aIsP1 ? m.player2_score : m.player1_score;
                  const winnerName =
                    m.winner_id === playerA.user_id
                      ? playerA.display_name
                      : m.winner_id === playerB.user_id
                      ? playerB.display_name
                      : "—";
                  const winnerIsA = m.winner_id === playerA.user_id;
                  const tournamentName = (m.tournaments as any)?.name ?? "Unknown";

                  return (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-heading text-foreground">{tournamentName}</td>
                      <td className="py-3 px-2 text-center font-display text-muted-foreground">R{m.round}</td>
                      <td className="py-3 px-2 text-center font-display font-bold">
                        <span className={winnerIsA ? "text-primary" : "text-foreground"}>{scoreA ?? "—"}</span>
                        <span className="text-muted-foreground mx-1">–</span>
                        <span className={!winnerIsA ? "text-primary" : "text-foreground"}>{scoreB ?? "—"}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-display text-xs font-bold ${winnerIsA ? "text-primary" : "text-destructive"}`}>
                          {winnerName}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground text-xs">
                        {m.completed_at ? format(new Date(m.completed_at), "MMM d, yyyy") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default HeadToHeadHistory;
