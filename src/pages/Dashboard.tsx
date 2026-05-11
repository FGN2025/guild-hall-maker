import { useState, useEffect } from "react";
import { Trophy, Target, Swords, TrendingUp, Calendar, Clock, Users, Gamepad2, Compass, Wallet, Coins, GraduationCap, ExternalLink, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDashboard, type ActivitySummary, type DashboardActivityItem } from "@/hooks/useDashboard";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageHero from "@/components/PageHero";
import PageBackground from "@/components/PageBackground";
import usePageTitle from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import OnboardingWizard from "@/components/OnboardingWizard";
import PointsWalletCard from "@/components/shared/PointsWalletCard";
import { useAcademyPassportUrl } from "@/lib/academyPassport";

const ActivityPanel = ({
  title,
  icon: Icon,
  emptyIcon: EmptyIcon,
  emptyText,
  browseLabel,
  browseTo,
  detailBase,
  data,
  navigate,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyText: string;
  browseLabel: string;
  browseTo: string;
  detailBase: string;
  data: ActivitySummary;
  navigate: (to: string) => void;
}) => {
  const rows: DashboardActivityItem[] = [...data.active, ...data.completed].slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-bold text-foreground mb-5 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      {rows.length === 0 ? (
        <div className="text-center py-8">
          <EmptyIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-body mb-4">{emptyText}</p>
          <Button variant="outline" className="font-heading border-border" onClick={() => navigate(browseTo)}>
            {browseLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-muted rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-primary/40 border border-transparent transition-colors"
              onClick={() => navigate(`${detailBase}/${row.refId}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-heading font-semibold text-foreground truncate">{row.name}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize shrink-0 ${
                      row.isCompleted
                        ? "bg-success/15 text-success border-success/30"
                        : "bg-primary/15 text-primary border-primary/30"
                    }`}
                  >
                    {row.isCompleted ? "completed" : row.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {row.date && (
                  <p className="text-xs text-muted-foreground">
                    {row.isCompleted ? "Completed " : "Joined "}
                    {format(new Date(row.date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className="font-display text-sm font-bold text-primary">
                  {row.isCompleted ? `+${row.points}` : `${row.points}`} pts
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground inline ml-2" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  usePageTitle("Dashboard");
  const { stats, registeredTournaments, recentMatches, challenges, quests, isLoading } = useDashboard();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [, setOnboardingChecked] = useState(false);
  const passportUrl = useAcademyPassportUrl(user?.email);

  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      const [rolesRes, tenantRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1),
        supabase.from("tenant_admins").select("role").eq("user_id", user.id).limit(1),
        supabase.from("profiles").select("onboarding_completed").eq("user_id", user.id).single(),
      ]);

      const hasElevatedRole = (rolesRes.data && rolesRes.data.length > 0) ||
                               (tenantRes.data && tenantRes.data.length > 0);

      if (!hasElevatedRole && profileRes.data && !(profileRes.data as any).onboarding_completed) {
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);
    };

    checkOnboarding();
  }, [user]);

  const statCards = [
    { label: "Registered Tournaments", value: stats.tournamentsRegistered, icon: Trophy },
    { label: "Challenges Completed", value: stats.challengesCompleted, icon: Target },
    { label: "Quests Completed", value: stats.questsCompleted, icon: Compass },
    { label: "Win Rate", value: stats.matchesPlayed > 0 ? `${stats.winRate}%` : "—", icon: TrendingUp },
    { label: "Matches Played", value: stats.matchesPlayed, icon: Swords },
    { label: "Matches Won", value: stats.matchesWon, icon: Target },
    { label: "Total Earned", value: stats.totalPointsEarned, icon: Wallet },
    { label: "Spendable Points", value: stats.pointsAvailable, icon: Coins },
  ];

  return (
    <>
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
      <PageBackground pageSlug="dashboard" />
      <div className="space-y-6 relative z-10">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pt-4 md:pt-6">
          <PageHero pageSlug="dashboard" />
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2 page-heading">Welcome Back</p>
            <h1 className="font-display text-4xl font-bold text-foreground page-heading">Player Dashboard</h1>
          </div>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                  <Skeleton className="h-5 w-5 mb-3 rounded" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6">
                  <Skeleton className="h-6 w-40 mb-5" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="bg-muted rounded-lg p-4 flex items-center justify-between animate-pulse">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-5 glow-card">
                  <s.icon className="h-5 w-5 text-primary mb-3" />
                  <p className="font-display text-3xl font-bold text-foreground">{s.value}</p>
                  <p className="font-heading text-sm text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <PointsWalletCard />

            {challenges.academyLinked && (
              <div className="rounded-xl border border-accent/40 bg-card p-5 flex items-center justify-between gap-4 glow-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-foreground">FGN Academy Skill Passport</p>
                    <p className="text-xs text-muted-foreground font-body truncate">
                      Your synced challenge completions are tracked on Academy.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="font-heading border-accent/40 text-accent hover:bg-accent/10 shrink-0"
                  onClick={() => window.open(passportUrl, "_blank", "noopener,noreferrer")}
                >
                  Open Skill Passport
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
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
                    <Button variant="outline" className="font-heading border-border" onClick={() => navigate("/tournaments")}>
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

              <ActivityPanel
                title="My Challenges"
                icon={Target}
                emptyIcon={Target}
                emptyText="You haven't joined any challenges yet."
                browseLabel="Browse Challenges"
                browseTo="/challenges"
                detailBase="/challenges"
                data={challenges}
                navigate={navigate}
              />

              <ActivityPanel
                title="My Quests"
                icon={Compass}
                emptyIcon={Compass}
                emptyText="No active quests yet — pick one to start your storyline."
                browseLabel="Browse Quests"
                browseTo="/quests"
                detailBase="/quests"
                data={quests}
                navigate={navigate}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;
