import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHero from "@/components/PageHero";
import PageBackground from "@/components/PageBackground";
import { useSeasons, useSeasonStats, useSeasonProgression } from "@/hooks/useSeasonStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GameStatsView from "@/components/stats/GameStatsView";
import MyStatsView from "@/components/stats/MyStatsView";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Calendar, Users, Zap, Target, TrendingUp, Award, Crown, Star, Shield, Download, FileText, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { exportCsv, exportPdf } from "@/lib/exportSeasonStats";
import { toast } from "@/hooks/use-toast";

const tierColors: Record<string, string> = {
  platinum: "hsl(var(--primary))",
  gold: "hsl(var(--warning, 45 93% 47%))",
  silver: "hsl(var(--foreground) / 0.5)",
  bronze: "hsl(30 60% 50%)",
};

const tierLabels: Record<string, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

const SeasonStats = () => {
  usePageTitle("Season Stats");
  const { user } = useAuth();
  const [filterGameId, setFilterGameId] = useState<string>("all");

  const { data: games = [] } = useQuery({
    queryKey: ["stats-games-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: seasons } = useSeasons(filterGameId !== "all" ? filterGameId : undefined);
  const activeSeason = seasons?.find((s) => s.status === "active");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const effectiveSeasonId = selectedSeasonId || activeSeason?.id || null;
  const selectedSeason = seasons?.find((s) => s.id === effectiveSeasonId);

  const { data: stats, isLoading } = useSeasonStats(effectiveSeasonId);
  const { data: progression } = useSeasonProgression();

  return (
    <div className="min-h-screen bg-background grid-bg relative">
      <PageBackground pageSlug="season-stats" />
      <div className="py-8 container mx-auto px-4 relative z-10">
        <PageHero pageSlug="season-stats" />
        {/* Header */}
        <div className="mb-6">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Analytics</p>
          <h1 className="font-display text-4xl font-bold text-foreground">Statistics</h1>
        </div>

        <Tabs defaultValue="season" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="season">Season Stats</TabsTrigger>
            <TabsTrigger value="game">Game Stats</TabsTrigger>
            <TabsTrigger value="my-stats">My Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="season">

        {/* Game + Season selector */}
        <div className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-xl border border-border bg-card">
          <Gamepad2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={filterGameId} onValueChange={(v) => { setFilterGameId(v); setSelectedSeasonId(null); }}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-background border-border">
              <SelectValue placeholder="All Games" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {games.map((g: any) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-heading text-muted-foreground mr-1">Season:</span>
          <Select
            value={effectiveSeasonId ?? ""}
            onValueChange={(v) => setSelectedSeasonId(v)}
          >
            <SelectTrigger className="w-[220px] h-9 text-sm bg-background border-border">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {(seasons ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.status === "active" && "(Current)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSeason && (
            <div className="flex items-center gap-2 ml-auto">
              <Badge
                variant="outline"
                className={selectedSeason.status === "active" ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"}
              >
                {selectedSeason.status === "active" ? "● Live" : "Completed"}
              </Badge>
              <span className="text-xs text-muted-foreground font-body">
                {new Date(selectedSeason.start_date).toLocaleDateString()} — {new Date(selectedSeason.end_date).toLocaleDateString()}
              </span>
              {stats && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 ml-2"
                    onClick={() => {
                      exportCsv(stats, selectedSeason.name);
                      toast({ title: "CSV downloaded", description: `${selectedSeason.name} stats exported.` });
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => exportPdf(stats, selectedSeason.name)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !stats ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg text-foreground mb-2">No season data available</h3>
            <p className="text-sm text-muted-foreground font-body">
              Statistics will appear once a season has been created and matches played.
            </p>
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users} label="Total Players" value={stats.totalPlayers} />
              <StatCard icon={Target} label="Total Matches" value={stats.totalMatches} />
              <StatCard icon={Zap} label="Total Points" value={stats.totalPoints} accent />
              <StatCard icon={TrendingUp} label="Avg Pts/Match" value={stats.avgPointsPerMatch} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Players Bar Chart */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Top Players by Points
                </h3>
                {stats.topPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No player data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={stats.topPlayers.map((p) => ({
                        name: p.display_name.length > 10 ? p.display_name.slice(0, 10) + "…" : p.display_name,
                        points: p.points,
                        wins: p.wins,
                      }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Bar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Points" />
                      <Bar dataKey="wins" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="Wins" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Tier Distribution Pie Chart */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Tier Distribution
                </h3>
                {stats.tierDistribution.every((t) => t.count === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Not enough players for tier breakdown.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="60%" height={250}>
                      <PieChart>
                        <Pie
                          data={stats.tierDistribution.filter((t) => t.count > 0)}
                          dataKey="count"
                          nameKey="tier"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          strokeWidth={2}
                          stroke="hsl(var(--card))"
                        >
                          {stats.tierDistribution
                            .filter((t) => t.count > 0)
                            .map((entry) => (
                              <Cell key={entry.tier} fill={tierColors[entry.tier] ?? "hsl(var(--muted))"} />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(value: number, name: string) => [value, tierLabels[name] ?? name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2">
                      {stats.tierDistribution
                        .filter((t) => t.count > 0)
                        .map((t) => (
                          <div key={t.tier} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tierColors[t.tier] }} />
                            <span className="text-sm text-foreground font-heading capitalize">{tierLabels[t.tier]}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{t.count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Season Progression Chart */}
            {progression && progression.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6 mb-8">
                <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Season Progression
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progression} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="season_name"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                    <Line
                      type="monotone"
                      dataKey="avg_points"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 4 }}
                      name="Avg Points"
                    />
                    <Line
                      type="monotone"
                      dataKey="total_players"
                      stroke="hsl(var(--primary) / 0.5)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary) / 0.5)", r: 4 }}
                      name="Total Players"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Most Active Players Table */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Most Active Players
              </h3>
              {stats.topPlayers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No player activity data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                        <th className="text-left py-3 px-2">#</th>
                        <th className="text-left py-3 px-2">Player</th>
                        <th className="text-center py-3 px-2">Points</th>
                        <th className="text-center py-3 px-2">Wins</th>
                        <th className="text-center py-3 px-2">Losses</th>
                        <th className="text-center py-3 px-2">Win Rate</th>
                        <th className="text-center py-3 px-2">Tournaments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topPlayers.map((p, i) => {
                        const total = p.wins + p.losses;
                        const wr = total > 0 ? Math.round((p.wins / total) * 100) : 0;
                        return (
                          <tr key={p.user_id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-2 font-display font-bold text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={p.avatar_url ?? undefined} />
                                  <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
                                    {p.display_name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <Link
                                  to={`/player/${p.user_id}`}
                                  className="font-heading font-semibold text-foreground hover:text-primary transition-colors truncate"
                                >
                                  {p.display_name}
                                </Link>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center font-display font-bold text-primary">{p.points}</td>
                            <td className="py-3 px-2 text-center font-display text-success">{p.wins}</td>
                            <td className="py-3 px-2 text-center font-display text-destructive">{p.losses}</td>
                            <td className="py-3 px-2 text-center font-display text-primary">{wr}%</td>
                            <td className="py-3 px-2 text-center font-display text-muted-foreground">{p.tournaments_played}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
          </TabsContent>

          <TabsContent value="game">
            <GameStatsView />
          </TabsContent>

          <TabsContent value="my-stats">
            <MyStatsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: boolean;
}) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs font-heading text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <p className={`font-display text-3xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>
      {typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value}
    </p>
  </div>
);

export default SeasonStats;
