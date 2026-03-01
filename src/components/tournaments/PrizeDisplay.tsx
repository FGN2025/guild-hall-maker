import { Trophy, Gift } from "lucide-react";

interface PrizeDisplayProps {
  prizeType?: string | null;
  prizePool?: string | null;
  pointsFirst?: number;
  pointsSecond?: number;
  pointsThird?: number;
  prizePctFirst?: number;
  prizePctSecond?: number;
  prizePctThird?: number;
  /** compact mode for cards */
  compact?: boolean;
}

const PrizeDisplay = ({
  prizeType,
  prizePool,
  pointsFirst = 10,
  pointsSecond = 5,
  pointsThird = 3,
  prizePctFirst = 50,
  prizePctSecond = 30,
  prizePctThird = 20,
  compact = false,
}: PrizeDisplayProps) => {
  const type = prizeType ?? "none";

  if (type === "none" || (!prizePool && type !== "physical")) {
    return <span className="text-muted-foreground">{compact ? "—" : "No Prize"}</span>;
  }

  if (type === "physical") {
    if (compact) {
      return (
        <span className="flex items-center gap-1">
          <Gift className="h-3.5 w-3.5 text-primary" />
          {prizePool || "Prize"}
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <span className="font-heading font-semibold text-foreground">{prizePool}</span>
      </div>
    );
  }

  // value type
  const numericValue = parseFloat((prizePool ?? "").replace(/[^0-9.]/g, ""));
  const pctSum = prizePctFirst + prizePctSecond + prizePctThird;
  const hasBreakdown = !isNaN(numericValue) && numericValue > 0 && pctSum === 100;

  if (compact) {
    return <span>{prizePool} pts</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <span className="font-heading font-semibold text-foreground">{prizePool} pts</span>
      </div>
      {hasBreakdown && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "1st", pct: prizePctFirst },
            { label: "2nd", pct: prizePctSecond },
            { label: "3rd", pct: prizePctThird },
          ].map((tier) => (
            <div key={tier.label} className="bg-muted rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">{tier.label}</p>
              <p className="font-heading text-xs font-semibold text-foreground">
                {Math.round(numericValue * (tier.pct / 100))} pts
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrizeDisplay;
