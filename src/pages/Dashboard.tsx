import Navbar from "@/components/Navbar";
import { Trophy, Target, Swords, TrendingUp, Calendar, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const stats = [
  { label: "Tournaments Played", value: "24", icon: Trophy, change: "+3 this month" },
  { label: "Win Rate", value: "67%", icon: Target, change: "+5% vs last month" },
  { label: "Matches Won", value: "48", icon: Swords, change: "Last 30 days" },
  { label: "Ranking", value: "#142", icon: TrendingUp, change: "Top 2%" },
];

const upcoming = [
  { title: "Apex Legends Showdown", round: "Quarter Finals", time: "Today, 8:00 PM", opponent: "Team Fury" },
  { title: "Valorant Masters Cup", round: "Group Stage", time: "Mar 22, 3:00 PM", opponent: "Shadow Squad" },
];

const recentMatches = [
  { opponent: "NightOwls", result: "W", score: "3-1", game: "Apex Legends" },
  { opponent: "Team Blaze", result: "W", score: "2-0", game: "Valorant" },
  { opponent: "Cyber Wolves", result: "L", score: "1-2", game: "CS2" },
  { opponent: "Pixel Storm", result: "W", score: "3-2", game: "Rocket League" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 container mx-auto px-4">
        <div className="mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Welcome Back</p>
          <h1 className="font-display text-4xl font-bold text-foreground">Player Dashboard</h1>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 glow-card">
              <div className="flex items-center justify-between mb-3">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{s.value}</p>
              <p className="font-heading text-sm text-muted-foreground mt-1">{s.label}</p>
              <p className="text-xs text-primary/70 mt-2">{s.change}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming matches */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold text-foreground mb-5 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Upcoming Matches
            </h2>
            <div className="space-y-4">
              {upcoming.map((m, i) => (
                <div key={i} className="bg-muted rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-heading font-semibold text-foreground">{m.title}</p>
                    <p className="text-sm text-muted-foreground">{m.round} · vs {m.opponent}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary text-sm font-heading">
                      <Clock className="h-3 w-3" /> {m.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent matches */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold text-foreground mb-5 flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" /> Recent Matches
            </h2>
            <div className="space-y-3">
              {recentMatches.map((m, i) => (
                <div key={i} className="bg-muted rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-display text-sm font-bold w-8 h-8 rounded flex items-center justify-center ${
                        m.result === "W"
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {m.result}
                    </span>
                    <div>
                      <p className="font-heading font-semibold text-foreground">vs {m.opponent}</p>
                      <p className="text-xs text-muted-foreground">{m.game}</p>
                    </div>
                  </div>
                  <p className="font-display text-sm font-bold text-foreground">{m.score}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Season progress */}
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Season Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-heading text-sm text-muted-foreground">Level 24 → Level 25</span>
                <span className="font-heading text-sm text-primary">2,400 / 3,000 XP</span>
              </div>
              <Progress value={80} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
