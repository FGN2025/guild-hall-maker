import { useParams, Link } from "react-router-dom";
import { useGameBySlug, useGameTournaments } from "@/hooks/useGames";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gamepad2, Calendar, Trophy, Loader2 } from "lucide-react";
import { format } from "date-fns";

const GameDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: game, isLoading } = useGameBySlug(slug ?? "");
  const { data: tournaments } = useGameTournaments(game?.name);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground font-heading">Game not found.</p>
        <Link to="/games" className="text-primary hover:underline mt-2 inline-block">Back to Games</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link to="/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-heading">
        <ArrowLeft className="h-4 w-4" /> Back to Games
      </Link>

      {/* Hero */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-80 shrink-0">
          {game.cover_image_url ? (
            <img src={game.cover_image_url} alt={game.name} className="w-full rounded-xl border border-border object-cover aspect-[3/4]" />
          ) : (
            <div className="w-full rounded-xl border border-border bg-secondary flex items-center justify-center aspect-[3/4]">
              <Gamepad2 className="h-20 w-20 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wider">{game.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-heading">{game.category}</Badge>
            {(game.platform_tags ?? []).map(tag => (
              <Badge key={tag} variant="outline" className="font-heading">{tag}</Badge>
            ))}
          </div>
          {game.description && (
            <p className="text-muted-foreground font-heading leading-relaxed">{game.description}</p>
          )}
        </div>
      </div>

      {/* User Guide */}
      {game.guide_content && (
        <section className="glass-panel rounded-xl p-6 space-y-3">
          <h2 className="font-display text-xl font-bold tracking-wider">User Guide</h2>
          <div className="prose prose-invert max-w-none font-heading text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {game.guide_content}
          </div>
        </section>
      )}

      {/* Tournaments */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold tracking-wider flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Tournaments
        </h2>
        {(!tournaments || tournaments.length === 0) ? (
          <p className="text-muted-foreground font-heading text-sm">No tournaments for this game yet.</p>
        ) : (
          <div className="grid gap-3">
            {tournaments.map(t => (
              <Link
                key={t.id}
                to={`/tournaments/${t.id}/bracket`}
                className="glass-panel rounded-lg p-4 flex items-center justify-between hover:border-primary/50 transition-colors border border-border"
              >
                <div>
                  <p className="font-heading font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(t.start_date), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge variant={t.status === "completed" ? "secondary" : "default"} className="font-heading capitalize">
                  {t.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default GameDetail;
