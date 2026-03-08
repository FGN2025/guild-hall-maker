import { Calendar, Users, Trophy, ArrowRight, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const FeaturedTournaments = () => {
  const { isAdmin, isModerator } = useAuth();
  const showRegCount = isAdmin || isModerator;

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["featured-tournaments"],
    queryFn: async () => {
      const query = supabase
        .from("tournaments")
        .select("id, name, game, start_date, max_participants, prize_pool, format, status") as any;
      const { data, error } = await query
        .eq("is_featured", true)
        .order("start_date", { ascending: true })
        .limit(3);

      if (error) throw error;

      // Get registration counts
      const ids = (data ?? []).map((t: any) => t.id);
      if (ids.length === 0) return [];

      const { data: regs } = await supabase
        .from("tournament_registrations")
        .select("tournament_id")
        .in("tournament_id", ids);

      const regCounts = new Map<string, number>();
      (regs ?? []).forEach((r: any) => {
        regCounts.set(r.tournament_id, (regCounts.get(r.tournament_id) || 0) + 1);
      });

      return (data ?? []).map((t: any) => ({
        id: t.id,
        title: t.name,
        game: t.game,
        date: format(new Date(t.start_date), "MMM d, yyyy"),
        players: `${regCounts.get(t.id) || 0}/${t.max_participants}`,
        playersMax: `${t.max_participants} max`,
        prize: t.prize_pool || "—",
        status: t.status === "open" ? "Open" : t.status === "in_progress" ? "Live" : "Upcoming",
        format: t.format?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "",
      }));
    },
    staleTime: 60_000,
  });

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Compete Now</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Featured Tournaments
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
        ) : tournaments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
              No tournaments scheduled yet — check back soon!
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
          <div className="grid md:grid-cols-3 gap-6">
            {tournaments.map((t: any) => (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-card p-6 glow-card flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <Badge
                    variant={t.status === "Open" ? "default" : "secondary"}
                    className={t.status === "Open" ? "bg-primary/15 text-primary border-primary/30" : ""}
                  >
                    {t.status}
                  </Badge>
                  <span className="text-xs font-body text-muted-foreground">{t.format}</span>
                </div>

                <h3 className="font-heading text-xl font-semibold text-foreground mb-1">{t.title}</h3>
                <p className="text-sm text-muted-foreground mb-6">{t.game}</p>

                <div className="mt-auto grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: Calendar, label: "Date", value: t.date },
                    { icon: Users, label: "Players", value: showRegCount ? t.players : t.playersMax },
                    { icon: Trophy, label: "Prize", value: t.prize },
                  ].map((info) => (
                    <div key={info.label} className="bg-muted rounded-lg p-3">
                      <info.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="font-heading text-sm font-semibold text-foreground">{info.value}</p>
                      <p className="text-[10px] text-muted-foreground">{info.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedTournaments;
