import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getRankInfo, XP_RANKS } from "@/hooks/usePlayerQuestXP";
import { Sparkles } from "lucide-react";

const rankColors: Record<string, string> = {
  novice: "bg-muted text-muted-foreground border-border",
  apprentice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  journeyman: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  expert: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  master: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

interface QuestRankBadgeProps {
  totalXP: number;
  compact?: boolean;
}

const QuestRankBadge = ({ totalXP, compact = false }: QuestRankBadgeProps) => {
  const { current, next, progressInRank } = getRankInfo(totalXP);
  const colorClass = rankColors[current.rank] || rankColors.novice;

  if (compact) {
    return (
      <Badge className={`gap-1 ${colorClass}`}>
        <Sparkles className="h-3 w-3" />
        {current.label}
      </Badge>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge className={`gap-1 ${colorClass}`}>
          <Sparkles className="h-3 w-3" />
          {current.label}
        </Badge>
        <span className="text-xs font-mono text-muted-foreground">{totalXP} XP</span>
      </div>
      {next && (
        <div className="space-y-1">
          <Progress value={progressInRank} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">
            {next.minXP - totalXP} XP to {next.label}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestRankBadge;
