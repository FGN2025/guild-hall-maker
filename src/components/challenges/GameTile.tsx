import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight } from "lucide-react";
import { getGameIdentity } from "@/lib/gameIdentity";
import type { HubGame } from "@/hooks/useChallengeHub";

interface GameTileProps {
  game: HubGame;
  showProgress?: boolean;
  basePath?: string;
}

const GameTile = ({ game, showProgress = false, basePath = "/challenges/game" }: GameTileProps) => {
  const identity = getGameIdentity(game.slug, game.category);
  const pct = game.total > 0 ? (game.completed / game.total) * 100 : 0;

  return (
    <Link
      to={`${basePath}/${game.slug}`}
      style={{ ["--game-accent" as any]: identity.accent }}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-card/80 backdrop-blur-sm transition-all hover:border-[hsl(var(--game-accent))] hover:shadow-[0_0_30px_-8px_hsl(var(--game-accent)/0.6)]"
    >
      <div className="relative h-40 md:h-44 overflow-hidden">
        <img
          src={identity.banner}
          alt={`${game.name} challenges`}
          loading="lazy"
          width={1536}
          height={512}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge
            className="border-0 text-background"
            style={{ backgroundColor: "hsl(var(--game-accent))" }}
          >
            {game.total} challenge{game.total === 1 ? "" : "s"}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">{game.name}</h3>
            <p className="font-body text-xs text-muted-foreground">{game.category}</p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
        <p className="line-clamp-2 font-body text-sm text-muted-foreground">{identity.tagline}</p>
        {showProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
              <span>Your progress</span>
              <span>
                {game.completed} / {game.total}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        )}
      </div>
    </Link>
  );
};

export default GameTile;
