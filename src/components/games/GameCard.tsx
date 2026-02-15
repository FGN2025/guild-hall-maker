import { Link } from "react-router-dom";
import type { Game } from "@/hooks/useGames";
import { Badge } from "@/components/ui/badge";
import { Gamepad2 } from "lucide-react";

const GameCard = ({ game }: { game: Game }) => {
  return (
    <Link
      to={`/games/${game.slug}`}
      className="group relative rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-all duration-300"
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        {game.cover_image_url ? (
          <img
            src={game.cover_image_url}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <Gamepad2 className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display text-lg font-bold text-foreground tracking-wide truncate">
            {game.name}
          </h3>
          <Badge variant="secondary" className="mt-1 text-xs font-heading">
            {game.category}
          </Badge>
        </div>
      </div>
    </Link>
  );
};

export default GameCard;
