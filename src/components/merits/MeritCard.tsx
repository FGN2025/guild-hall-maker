import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight } from "lucide-react";
import { getMeritIcon } from "@/components/merits/meritIcons";
import type { MeritWithProgress } from "@/hooks/useMeritPathways";

const levelStyles: Record<string, string> = {
  discover: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
  develop: "bg-violet-400/15 text-violet-300 border-violet-400/30",
  deploy: "bg-amber-400/15 text-amber-300 border-amber-400/30",
};

const MeritCard = ({ merit }: { merit: MeritWithProgress }) => {
  const Icon = getMeritIcon(merit.icon);
  const pct = merit.totalCount > 0 ? (merit.completedCount / merit.totalCount) * 100 : 0;

  return (
    <Link to={`/pathways/${merit.slug}`}>
      <Card className="h-full glow-card hover:border-primary/40 transition-all group">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <h3 className="font-display font-semibold text-foreground truncate">{merit.name}</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>

          {merit.description && (
            <p className="text-sm text-muted-foreground font-body line-clamp-2">{merit.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-[10px] capitalize ${levelStyles[merit.level] ?? ""}`}>
              {merit.level}
            </Badge>
            {merit.skills.slice(0, 3).map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] text-muted-foreground">
                {s.split(":")[1] ?? s}
              </Badge>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-body">Verified challenges</span>
              <span className="font-mono text-foreground">
                {merit.completedCount} / {merit.totalCount}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default MeritCard;
