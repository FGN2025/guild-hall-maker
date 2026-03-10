import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, CheckCircle2, Sparkles } from "lucide-react";

interface QuestChainCardProps {
  chain: any;
}

const QuestChainCard = ({ chain }: QuestChainCardProps) => {
  const progress = chain.totalCount > 0 ? (chain.completedCount / chain.totalCount) * 100 : 0;

  return (
    <Card className="overflow-hidden hover:border-primary/40 transition-all group cursor-pointer h-full">
      <div className="relative h-32 overflow-hidden">
        {chain.cover_image_url ? (
          <img src={chain.cover_image_url} alt={chain.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-primary/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display font-semibold text-white line-clamp-1">{chain.name}</h3>
          <p className="text-xs text-white/70 line-clamp-1 mt-0.5">{chain.quests.length} quests in chain</p>
        </div>
        {chain.isChainComplete && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Complete
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        {chain.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{chain.description}</p>
        )}
        {chain.story_intro && (
          <p className="text-xs text-muted-foreground/80 italic border-l-2 border-primary/30 pl-2 line-clamp-2">
            {chain.story_intro}
          </p>
        )}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-mono">{chain.completedCount}/{chain.totalCount}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        {chain.bonus_points > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Chain Bonus</span>
            <Badge variant="secondary" className="font-mono text-xs">+{chain.bonus_points} pts</Badge>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chain.quests.map((q: any, i: number) => {
            const isCompleted = chain.completedCount > i || (chain.quests.slice(0, i + 1).every((_: any, idx: number) => idx < chain.completedCount));
            const questCompleted = chain.completedCount > 0 && i < chain.completedCount;
            return (
              <Link key={q.id} to={`/quests/${q.id}`} onClick={(e) => e.stopPropagation()}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono border transition-colors ${
                  questCompleted
                    ? "bg-green-500/20 border-green-500/40 text-green-400"
                    : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                }`}>
                  {questCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestChainCard;
