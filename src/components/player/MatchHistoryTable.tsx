import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";
import type { MatchHistoryEntry } from "@/hooks/usePlayerProfile";

interface Props {
  matches: MatchHistoryEntry[];
}

const resultStyles = {
  win: "bg-success/15 text-success border-success/30",
  loss: "bg-destructive/15 text-destructive border-destructive/30",
  draw: "bg-warning/15 text-warning border-warning/30",
};

const MatchHistoryTable = ({ matches }: Props) => {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <History className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground font-body">No match history yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Match History
        </h3>
      </div>
      <ScrollArea className="max-h-[400px]">
        <div className="grid grid-cols-12 gap-2 p-3 border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
          <span className="col-span-2">Date</span>
          <span className="col-span-3">Tournament</span>
          <span className="col-span-3">Opponent</span>
          <span className="col-span-1 text-center">Round</span>
          <span className="col-span-1 text-center">Score</span>
          <span className="col-span-2 text-center">Result</span>
        </div>
        {matches.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-12 gap-2 p-3 border-b border-border/50 hover:bg-muted/50 transition-colors items-center text-sm"
          >
            <span className="col-span-2 font-body text-muted-foreground text-xs">
              {m.completed_at ? format(new Date(m.completed_at), "MMM d, yy") : "—"}
            </span>
            <span className="col-span-3 font-heading text-foreground truncate text-xs">
              {m.tournament_name}
            </span>
            <span className="col-span-3 font-body text-foreground truncate text-xs">
              {m.opponent_name}
            </span>
            <span className="col-span-1 font-body text-muted-foreground text-center text-xs">
              R{m.round}
            </span>
            <span className="col-span-1 font-display text-foreground text-center text-xs">
              {m.player_score !== null && m.opponent_score !== null
                ? `${m.player_score}-${m.opponent_score}`
                : "—"}
            </span>
            <div className="col-span-2 flex justify-center">
              <Badge variant="outline" className={`text-[10px] font-display uppercase ${resultStyles[m.result]}`}>
                {m.result}
              </Badge>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};

export default MatchHistoryTable;
