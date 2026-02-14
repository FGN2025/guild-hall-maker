import Navbar from "@/components/Navbar";
import { Calendar, Users, Trophy, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const allTournaments = [
  { id: 1, title: "Apex Legends Showdown", game: "Apex Legends", date: "Mar 15, 2026", players: "64/128", prize: "$5,000", status: "Open", format: "Single Elimination" },
  { id: 2, title: "Valorant Masters Cup", game: "Valorant", date: "Mar 22, 2026", players: "32/32", prize: "$10,000", status: "Full", format: "Double Elimination" },
  { id: 3, title: "Rocket League Blitz", game: "Rocket League", date: "Apr 1, 2026", players: "18/64", prize: "$2,500", status: "Open", format: "Round Robin" },
  { id: 4, title: "CS2 Pro League", game: "Counter-Strike 2", date: "Apr 10, 2026", players: "8/16", prize: "$15,000", status: "Open", format: "Swiss" },
  { id: 5, title: "Fortnite Friday", game: "Fortnite", date: "Feb 21, 2026", players: "100/100", prize: "$1,000", status: "Full", format: "Battle Royale" },
  { id: 6, title: "League of Legends Clash", game: "League of Legends", date: "Apr 15, 2026", players: "12/32", prize: "$8,000", status: "Open", format: "Single Elimination" },
];

const Tournaments = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 container mx-auto px-4">
        <div className="mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Browse & Register</p>
          <h1 className="font-display text-4xl font-bold text-foreground">Tournaments</h1>
        </div>

        {/* Search / Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tournaments..." className="pl-10 bg-card border-border font-body" />
          </div>
          <Button variant="outline" className="font-heading gap-2 border-border text-muted-foreground hover:text-foreground">
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTournaments.map((t) => (
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
              <Button
                className="mt-4 w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={t.status === "Full"}
              >
                {t.status === "Open" ? "Register Now" : "Full"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tournaments;
