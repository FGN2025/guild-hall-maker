import { BracketMatch } from "@/hooks/useBracket";
import { cn } from "@/lib/utils";

interface Props {
  match: BracketMatch;
  isFinal?: boolean;
}

const BracketMatchCard = ({ match, isFinal }: Props) => {
  const isCompleted = match.status === "completed";
  const p1Won = isCompleted && match.winner_id === match.player1_id;
  const p2Won = isCompleted && match.winner_id === match.player2_id;
  const isDraw = isCompleted && !match.winner_id;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-all w-56",
        isFinal ? "border-primary/50 neon-border" : "border-border",
        isCompleted ? "opacity-100" : "opacity-80"
      )}
    >
      {/* Player 1 */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 border-b border-border/50 transition-colors",
          p1Won && "bg-success/10",
          isDraw && "bg-warning/5"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isCompleted && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                p1Won ? "bg-success" : isDraw ? "bg-warning" : "bg-destructive"
              )}
            />
          )}
          <span
            className={cn(
              "font-heading text-xs truncate",
              p1Won ? "text-foreground font-semibold" : "text-muted-foreground",
              !match.player1_name && "italic"
            )}
          >
            {match.player1_name ?? "TBD"}
          </span>
        </div>
        <span
          className={cn(
            "font-display text-xs font-bold shrink-0 ml-2 w-6 text-center",
            p1Won ? "text-success" : "text-muted-foreground"
          )}
        >
          {match.player1_score ?? "—"}
        </span>
      </div>

      {/* Player 2 */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 transition-colors",
          p2Won && "bg-success/10",
          isDraw && "bg-warning/5"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isCompleted && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                p2Won ? "bg-success" : isDraw ? "bg-warning" : "bg-destructive"
              )}
            />
          )}
          <span
            className={cn(
              "font-heading text-xs truncate",
              p2Won ? "text-foreground font-semibold" : "text-muted-foreground",
              !match.player2_name && "italic"
            )}
          >
            {match.player2_name ?? "TBD"}
          </span>
        </div>
        <span
          className={cn(
            "font-display text-xs font-bold shrink-0 ml-2 w-6 text-center",
            p2Won ? "text-success" : "text-muted-foreground"
          )}
        >
          {match.player2_score ?? "—"}
        </span>
      </div>
    </div>
  );
};

export default BracketMatchCard;
