import { useAuth } from "@/contexts/AuthContext";
import { useMyStats } from "@/hooks/useMyStats";
import { useSkillInsights } from "@/hooks/useSkillInsights";
import SkillInsightsPanel from "@/components/stats/SkillInsightsPanel";
import PlayerStatsReport from "@/components/stats/PlayerStatsReport";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Trophy, Target, TrendingUp, Zap, Award, Crown, Shield,
  Gamepad2, Users, LogIn,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const StatCard = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  accent?: boolean;
}) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs font-heading text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <p className={`font-display text-3xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>
      {value}
    </p>
  </div>
);

const tierIcons: Record<string, typeof Crown> = {
  platinum: Crown,
  gold: Award,
  silver: Shield,
  bronze: Shield,
};

const MyStatsView = () => {
  const { user } = useAuth();
  const { data: stats, isLoading } = useMyStats(user?.id);
  const { data: insights, isLoading: insightsLoading } = useSkillInsights(user?.id);

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <LogIn className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg text-foreground mb-2">Sign in to view your stats</h3>
        <p className="text-sm text-muted-foreground font-body">
          Log in to see your personal performance dashboard and skill insights.
        </p>
        <Link to="/auth" className="inline-block mt-4 text-primary hover:underline text-sm font-heading">
          Sign In →
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats || stats.totalMatches === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg text-foreground mb-2">No match data yet</h3>
        <p className="text-sm text-muted-foreground font-body">
          Compete in tournaments to start tracking your performance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Trophy} label="Total Wins" value={stats.totalWins} accent />
        <StatCard icon={Target} label="Total Matches" value={stats.totalMatches} />
        <StatCard icon={TrendingUp} label="Win Rate" value={`${stats.winRate}%`} accent />
        <StatCard icon={Zap} label="Total Points" value={stats.totalPoints} />
      </div>

      {/* Skills Overview Radar Chart */}
      <PlayerStatsReport userId={user.id} />

      {/* Per-game breakdown chart */}
      {stats.gameBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            Performance by Game
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={stats.gameBreakdown.slice(0, 10).map((g) => ({
                name: g.game_name.length > 12 ? g.game_name.slice(0, 12) + "…" : g.game_name,
                wins: g.wins,
                losses: g.losses,
              }))}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="wins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Wins" />
              <Bar dataKey="losses" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="Losses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-game table */}
      {stats.gameBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            Game Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Game</th>
                  <th className="text-center py-3 px-2">Genre</th>
                  <th className="text-center py-3 px-2">Matches</th>
                  <th className="text-center py-3 px-2">Wins</th>
                  <th className="text-center py-3 px-2">Losses</th>
                  <th className="text-center py-3 px-2">Win Rate</th>
                  <th className="text-center py-3 px-2">Tournaments</th>
                </tr>
              </thead>
              <tbody>
                {stats.gameBreakdown.map((g) => (
                  <tr key={g.game_name} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 font-heading font-semibold text-foreground">{g.game_name}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant="outline" className="text-xs">{g.category}</Badge>
                    </td>
                    <td className="py-3 px-2 text-center font-display text-foreground">{g.matches}</td>
                    <td className="py-3 px-2 text-center font-display text-green-500">{g.wins}</td>
                    <td className="py-3 px-2 text-center font-display text-destructive">{g.losses}</td>
                    <td className="py-3 px-2 text-center font-display text-primary">{g.win_rate}%</td>
                    <td className="py-3 px-2 text-center font-display text-muted-foreground">{g.tournaments_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Season breakdown */}
      {stats.seasonBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Season History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Season</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-center py-3 px-2">Points</th>
                  <th className="text-center py-3 px-2">W/L</th>
                  <th className="text-center py-3 px-2">Tournaments</th>
                  <th className="text-center py-3 px-2">Tier</th>
                  <th className="text-center py-3 px-2">Rank</th>
                </tr>
              </thead>
              <tbody>
                {stats.seasonBreakdown.map((s) => {
                  const TierIcon = tierIcons[s.tier ?? ""] ?? Shield;
                  return (
                    <tr key={s.season_id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-heading font-semibold text-foreground">{s.season_name}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-xs">
                          {s.status === "active" ? "Active" : "Completed"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center font-display font-bold text-primary">{s.points}</td>
                      <td className="py-3 px-2 text-center font-display text-foreground">
                        <span className="text-green-500">{s.wins}</span> / <span className="text-destructive">{s.losses}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-display text-muted-foreground">{s.tournaments_played}</td>
                      <td className="py-3 px-2 text-center">
                        {s.tier ? (
                          <div className="flex items-center justify-center gap-1">
                            <TierIcon className="h-3.5 w-3.5 text-primary" />
                            <span className="font-heading text-xs capitalize text-foreground">{s.tier}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-display text-muted-foreground">
                        {s.rank ? `#${s.rank}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Skill Insights */}
      {!insightsLoading && insights && (
        <SkillInsightsPanel
          gameInsights={insights.gameInsights}
          genreInsights={insights.genreInsights}
        />
      )}
    </div>
  );
};

export default MyStatsView;
