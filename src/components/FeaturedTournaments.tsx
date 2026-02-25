import { Calendar, Users, Trophy, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const tournaments = [
  {
    id: 1,
    title: "Apex Legends Showdown",
    game: "Apex Legends",
    date: "Mar 15, 2026",
    players: "64/128",
    prize: "$500",
    status: "Open",
    format: "Single Elimination",
  },
  {
    id: 2,
    title: "Valorant Masters Cup",
    game: "Valorant",
    date: "Mar 22, 2026",
    players: "32/32",
    prize: "$1,000",
    status: "Full",
    format: "Double Elimination",
  },
  {
    id: 3,
    title: "Rocket League Blitz",
    game: "Rocket League",
    date: "Apr 1, 2026",
    players: "18/64",
    prize: "$250",
    status: "Open",
    format: "Round Robin",
  },
];

const FeaturedTournaments = () => {
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

        <div className="grid md:grid-cols-3 gap-6">
          {tournaments.map((t) => (
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
                  { icon: Users, label: "Players", value: t.players },
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
      </div>
    </section>
  );
};

export default FeaturedTournaments;
