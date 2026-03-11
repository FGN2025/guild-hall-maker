import { useParams, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useGameBySlug, useGameTournaments } from "@/hooks/useGames";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gamepad2, Calendar, Trophy, Loader2, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

const GameDetail = () => {
  usePageTitle("Game Detail");
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { data: game, isLoading } = useGameBySlug(slug ?? "");
  const { data: tournaments } = useGameTournaments(game?.name);

  const { data: profile } = useQuery({
    queryKey: ["profile-steam", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("steam_id, steam_username")
        .eq("user_id", user!.id)
        .single();
      return data as { steam_id: string | null; steam_username: string | null } | null;
    },
    enabled: !!user,
  });

  const hasSteamLinked = !!profile?.steam_id;

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

          {/* Launch on Steam */}
          {game.steam_app_id && (
            <div className="pt-2 space-y-2">
              <Button
                size="lg"
                className="gap-2 font-heading tracking-wide"
                onClick={() => {
                  window.location.href = `steam://run/${game.steam_app_id}`;
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Launch on Steam
              </Button>
              {user && !hasSteamLinked && (
                <p className="text-xs text-muted-foreground font-heading">
                  <Link to="/profile" className="text-primary hover:underline">Link your Steam account</Link> to verify game ownership.
                </p>
              )}
              {hasSteamLinked && (
                <p className="text-xs text-emerald-500 font-heading flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Steam linked as {profile?.steam_username}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Guide */}
      {game.guide_content && (
        <section className="glass-panel rounded-xl p-6 space-y-3">
          <h2 className="font-display text-xl font-bold tracking-wider">User Guide</h2>
          <div className="prose prose-invert max-w-none font-heading text-sm text-muted-foreground leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-wider [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-wider [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:mb-2 [&_strong]:text-foreground [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
            <ReactMarkdown>{game.guide_content}</ReactMarkdown>
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
