import { Trophy, Gift } from "lucide-react";

interface PrizeDisplayProps {
  prizeType?: string | null;
  prizePool?: string | null;
  format?: string | null;
  pointsFirst?: number | null;
  pointsSecond?: number | null;
  pointsThird?: number | null;
  pointsParticipationLong?: number | null;
  pointsParticipationShort?: number | null;
  prizePctFirst?: number;
  prizePctSecond?: number;
  prizePctThird?: number;
  /** compact mode for cards */
  compact?: boolean;
}

const isGameNightFormat = (format?: string | null) =>
  (format ?? "").toLowerCase().replace(/[\s_-]/g, "").includes("gamenight");

const PrizeDisplay = ({
  prizeType,
  prizePool,
  format,
  pointsFirst,
  pointsSecond,
  pointsThird,
  pointsParticipationLong,
  pointsParticipationShort,
  compact = false,
}: PrizeDisplayProps) => {
  const type = prizeType ?? "none";

  // Physical prizes always win — show the item name.
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

  const gameNight = isGameNightFormat(format);
  const long = pointsParticipationLong ?? 0;
  const short = pointsParticipationShort ?? 0;
  const first = pointsFirst ?? 0;
  const second = pointsSecond ?? 0;
  const third = pointsThird ?? 0;

  const totalPoints = gameNight ? long : first + second + third;

  // Legacy fallback: older tournaments that stored a numeric point pool.
  const legacyPool = parseFloat((prizePool ?? "").replace(/[^0-9.]/g, ""));
  const effectivePoints =
    totalPoints > 0 ? totalPoints : !isNaN(legacyPool) && legacyPool > 0 ? legacyPool : 0;

  if (effectivePoints <= 0) {
    return <span className="text-muted-foreground">{compact ? "—" : "No Prize"}</span>;
  }

  if (compact) {
    return <span>{effectivePoints} pts</span>;
  }

  const tiers = gameNight
    ? [
        { label: "Long Session", value: long },
        { label: "Short Session", value: short },
      ]
    : [
        { label: "1st", value: first },
        { label: "2nd", value: second },
        { label: "3rd", value: third },
      ];

  const hasBreakdown = tiers.some((t) => t.value > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <span className="font-heading font-semibold text-foreground">{effectivePoints} pts</span>
      </div>
      {hasBreakdown && (
        <div className={`grid gap-2 text-center ${gameNight ? "grid-cols-2" : "grid-cols-3"}`}>
          {tiers.map((tier) => (
            <div key={tier.label} className="bg-muted rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">{tier.label}</p>
              <p className="font-heading text-xs font-semibold text-foreground">{tier.value} pts</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrizeDisplay;
