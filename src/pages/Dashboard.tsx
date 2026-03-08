import { Trophy, Target, Swords, TrendingUp, Calendar, Clock, Users, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/useDashboard";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageHero from "@/components/PageHero";
import PageBackground from "@/components/PageBackground";
import usePageTitle from "@/hooks/usePageTitle";

const Dashboard = () => {
  usePageTitle("Dashboard");
  const { stats, registeredTournaments, recentMatches, isLoading } = useDashboard();
  const navigate = useNavigate();

  const statCards = [
    { label: "Registered Tournaments", value: stats.tournamentsRegistered, icon: Trophy, accent: "text-primary" },
    { label: "Matches Played", value: stats.matchesPlayed, icon: Swords, accent: "text-primary" },
    { label: "Matches Won", value: stats.matchesWon, icon: Target, accent: "text-primary" },
    { label: "Win Rate", value: stats.matchesPlayed > 0 ? `${stats.winRate}%` : "—", icon: TrendingUp, accent: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background grid-bg relative">
      <PageBackground pageSlug="dashboard" />
      <div className="py-8 container mx-auto px-4 relative z-10">
        <PageHero pageSlug="dashboard" />
        <div className="mb-10">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Welcome Back</p>
          <h1 className="font-display text-4xl font-bold text-foreground">Player Dashboard</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-5 glow-card">
                  <s.icon className={`h-5 w-5 ${s.accent} mb-3`} />
                  <p className="font-display text-3xl font-bold text-foreground">{s.value}</p>
                  <p className="font-heading text-sm text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Registered tournaments */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> My Tournaments
                </h2>
                {registeredTournaments.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-body mb-4">
                      You haven't registered for any tournaments yet.
                    </p>
                    <Button
                      variant="outline"
                      className="font-heading border-border"
                      onClick={() => navigate("/tournaments")}
                    >
                      Browse Tournaments
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registeredTournaments.map((t) => (
                      <div
                        key={t.id}
                        className="bg-muted rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-primary/40 border border-transparent transition-colors"
onClick={() => navigate(`/tournaments/${t.id}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-heading font-semibold text-foreground truncate">{t.name}</p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize shrink-0 ${
                                t.status === "open"
                                  ? "bg-primary/15 text-primary border-primary/30"
                                  : t.status === "in_progress"
                                  ? "bg-accent/15 text-accent border-accent/30"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {t.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Gamepad2 className="h-3 w-3" /> {t.game}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {t.max_participants} max
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className="flex items-center gap-1 text-primary text-xs font-heading">
                            <Clock className="h-3 w-3" />
                            {format(new Date(t.start_date), "MMM d, yyyy")}
                          </div>
                          {t.prize_pool && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{t.prize_pool}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent matches */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" /> Recent Matches
                </h2>
                {recentMatches.length === 0 ? (
                  <div className="text-center py-8">
                    <Swords className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-body">
                      No matches played yet. Join a tournament to get started!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentMatches.map((m) => (
                      <div key={m.id} className="bg-muted rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-display text-sm font-bold w-8 h-8 rounded flex items-center justify-center ${
                              m.result === "W"
                                ? "bg-success/15 text-success"
                                : m.result === "L"
                                ? "bg-destructive/15 text-destructive"
                                : m.result === "D"
                                ? "bg-warning/15 text-warning"
                                : "bg-muted-foreground/15 text-muted-foreground"
                            }`}
                          >
                            {m.result === "pending" ? "—" : m.result}
                          </span>
                          <div>
                            <p className="font-heading font-semibold text-foreground">vs {m.opponent_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.tournament_name} · Round {m.round}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {m.player_score !== null && m.opponent_score !== null ? (
                            <p className="font-display text-sm font-bold text-foreground">
                              {m.player_score}-{m.opponent_score}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Scheduled</p>
                          )}
                          {m.completed_at && (
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(m.completed_at), "MMM d")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
