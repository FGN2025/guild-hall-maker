import { Calendar, Users, Trophy, ArrowRight, Gamepad2, Target, Compass, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface FeaturedEvent {
  id: string;
  type: "tournament" | "challenge" | "quest";
  title: string;
  game: string;
  status: string;
  date: string | null;
  stat1Label: string;
  stat1Value: string;
  stat1Icon: any;
  stat2Label: string;
  stat2Value: string;
  stat2Icon: any;
  link: string;
  imageUrl?: string;
}

const typeBadgeStyle: Record<string, string> = {
  tournament: "bg-primary/15 text-primary border-primary/30",
  challenge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  quest: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const FeaturedEvents = () => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["featured-events"],
    queryFn: async () => {
      const results: FeaturedEvent[] = [];

      // Fetch featured tournaments
      const { data: tourneys } = await (supabase
        .from("tournaments")
        .select("id, name, game, start_date, max_participants, prize_pool, format, status, image_url") as any)
        .eq("is_featured", true)
        .order("start_date", { ascending: true });

      // Fetch fallback game covers for tournaments without image_url
      const gamesWithoutImage = (tourneys ?? [])
        .filter((t: any) => !t.image_url)
        .map((t: any) => t.game);

      let gameCovers: Record<string, string> = {};
      if (gamesWithoutImage.length > 0) {
        const { data: gamesData } = await supabase
          .from("games")
          .select("name, cover_image_url")
          .in("name", gamesWithoutImage);
        (gamesData ?? []).forEach((g: any) => {
          if (g.cover_image_url) gameCovers[g.name] = g.cover_image_url;
        });
      }

      (tourneys ?? []).forEach((t: any) => {
        results.push({
          id: t.id,
          type: "tournament",
          title: t.name,
          game: t.game,
          status: t.status === "open" ? "Open" : t.status === "in_progress" ? "Live" : "Upcoming",
          date: t.start_date ? format(new Date(t.start_date), "MMM d, yyyy") : null,
          stat1Label: "Date",
          stat1Value: t.start_date ? format(new Date(t.start_date), "MMM d") : "TBD",
          stat1Icon: Calendar,
          stat2Label: "Prize",
          stat2Value: t.prize_pool || "—",
          stat2Icon: Trophy,
          link: `/tournaments/${t.id}`,
          imageUrl: t.image_url || gameCovers[t.game] || undefined,
        });
      });

      // Fetch featured challenges
      const { data: challenges } = await (supabase
        .from("challenges")
        .select("id, name, difficulty, points_first, estimated_minutes, cover_image_url, game_id, games(name, cover_image_url)") as any)
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      (challenges ?? []).forEach((c: any) => {
        results.push({
          id: c.id,
          type: "challenge",
          title: c.name,
          game: c.games?.name ?? "",
          status: c.difficulty?.charAt(0).toUpperCase() + c.difficulty?.slice(1) || "Active",
          date: null,
          stat1Label: "Points",
          stat1Value: `${c.points_first} pts`,
          stat1Icon: Star,
          stat2Label: "Time",
          stat2Value: c.estimated_minutes ? `~${c.estimated_minutes}m` : "—",
          stat2Icon: Clock,
          link: `/challenges/${c.id}`,
          imageUrl: c.cover_image_url || c.games?.cover_image_url || undefined,
        });
      });

      // Fetch featured quests
      const { data: quests } = await (supabase
        .from("quests")
        .select("id, name, difficulty, points_first, xp_reward, estimated_minutes, cover_image_url, game_id, games(name, cover_image_url)") as any)
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      (quests ?? []).forEach((q: any) => {
        results.push({
          id: q.id,
          type: "quest",
          title: q.name,
          game: q.games?.name ?? "",
          status: q.difficulty?.charAt(0).toUpperCase() + q.difficulty?.slice(1) || "Active",
          date: null,
          stat1Label: "Points",
          stat1Value: `${q.points_first} pts`,
          stat1Icon: Star,
          stat2Label: "XP",
          stat2Value: q.xp_reward ? `${q.xp_reward} XP` : "—",
          stat2Icon: Compass,
          link: `/quests/${q.id}`,
          imageUrl: q.cover_image_url || q.games?.cover_image_url || undefined,
        });
      });

      return results;
    },
    staleTime: 60_000,
  });

  const typeIcon: Record<string, any> = {
    tournament: Trophy,
    challenge: Target,
    quest: Compass,
  };

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6 md:px-10 lg:px-16">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Don't Miss Out</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Featured Events
            </h2>
          </div>
          <Link to="/tournaments" className="hidden sm:flex items-center gap-1 text-primary font-heading font-medium hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
              No featured events yet — check back soon!
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Explore our game library while you wait for upcoming events.
            </p>
            <Link
              to="/games"
              className="inline-flex items-center gap-2 text-primary font-heading font-medium hover:underline"
            >
              Browse Games <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => {
              const TypeIcon = typeIcon[e.type];
              return (
                <Link
                  key={`${e.type}-${e.id}`}
                  to={e.link}
                  className="rounded-xl border border-border bg-card overflow-hidden glow-card flex flex-col hover:border-primary/40 transition-colors"
                >
                  {/* Hero Image */}
                  <div className="relative h-36 bg-muted overflow-hidden">
                    {e.imageUrl ? (
                      <img src={e.imageUrl} alt={e.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="font-display text-lg text-foreground/60 uppercase tracking-widest">{e.game || e.type}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={typeBadgeStyle[e.type]}
                      >
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {e.type.charAt(0).toUpperCase() + e.type.slice(1)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {e.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-1 line-clamp-1">{e.title}</h3>
                    <p className="text-sm text-muted-foreground mb-6">{e.game || "General"}</p>

                    <div className="mt-auto grid grid-cols-2 gap-3 text-center">
                      <div className="bg-muted rounded-lg p-3">
                        <e.stat1Icon className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="font-heading text-sm font-semibold text-foreground">{e.stat1Value}</p>
                        <p className="text-[10px] text-muted-foreground">{e.stat1Label}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <e.stat2Icon className="h-4 w-4 text-primary mx-auto mb-1" />
                        <p className="font-heading text-sm font-semibold text-foreground">{e.stat2Value}</p>
                        <p className="text-[10px] text-muted-foreground">{e.stat2Label}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedEvents;
