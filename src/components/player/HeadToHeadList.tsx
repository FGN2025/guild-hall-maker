import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Swords } from "lucide-react";
import { Link } from "react-router-dom";
import type { HeadToHeadRecord } from "@/hooks/usePlayerProfile";

interface Props {
  records: HeadToHeadRecord[];
}

const HeadToHeadList = ({ records }: Props) => {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Swords className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground font-body">No head-to-head data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" /> Head-to-Head Records
        </h3>
      </div>
      <ScrollArea className="max-h-[320px]">
        {records.map((r) => {
          const winPct = r.total > 0 ? Math.round((r.wins / r.total) * 100) : 0;
          return (
            <Link
              to={`/player/${r.opponent_id}`}
              key={r.opponent_id}
              className="flex items-center gap-3 p-3 border-b border-border/50 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={r.opponent_avatar ?? undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
                  {r.opponent_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm text-foreground truncate">{r.opponent_name}</p>
                <p className="text-xs text-muted-foreground font-body">{r.total} matches</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-display">
                <span className="text-success font-bold">{r.wins}W</span>
                <span className="text-destructive font-bold">{r.losses}L</span>
                {r.draws > 0 && <span className="text-warning font-bold">{r.draws}D</span>}
              </div>
              <div className="w-12 text-right">
                <span className={`font-display text-xs font-bold ${winPct >= 50 ? "text-success" : "text-destructive"}`}>
                  {winPct}%
                </span>
              </div>
            </Link>
          );
        })}
      </ScrollArea>
    </div>
  );
};

export default HeadToHeadList;
