import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Swords } from "lucide-react";

interface CompetitiveGamingTileProps {
  total: number;
  completed: number;
  showProgress?: boolean;
}

const CompetitiveGamingTile = ({ total, completed, showProgress = false }: CompetitiveGamingTileProps) => {
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <Link
      to="/challenges/competitive-gaming"
      className="group relative block overflow-hidden rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-sm transition-all hover:border-primary hover:shadow-[0_0_30px_-8px_hsl(var(--primary)/0.6)]"
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/25 via-background to-accent/20 md:h-44">
        <Swords className="h-16 w-16 text-primary transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute left-4 top-4">
          <Badge className="border-0">{total} challenge{total === 1 ? "" : "s"}</Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Competitive Gaming</h3>
            <p className="font-body text-xs text-muted-foreground">Head-to-head play outside tournaments</p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
        <p className="line-clamp-2 font-body text-sm text-muted-foreground">
          Standard game challenges you can complete any time — no bracket, no schedule.
        </p>
        {showProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
              <span>Your progress</span>
              <span>
                {completed} / {total}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        )}
      </div>
    </Link>
  );
};

export default CompetitiveGamingTile;
