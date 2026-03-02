import { useState } from "react";
import { useGames } from "@/hooks/useGames";
import { useGameStats, useGameStatsOverview } from "@/hooks/useGameStats";
import { useSeasons } from "@/hooks/useSeasonStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "recharts";
import { Gamepad2, Users, Target, Trophy, Crown, Star, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

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
      {value}
    </p>
  </div>
);

const GameStatsView = () => {
  const { data: games } = useGames();
  const { data: seasons } = useSeasons();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Find the season date range for filtering
  const selectedSeason = seasons?.find((s) => s.id === selectedSeasonId);
  const seasonRange = selectedSeason
    ? { start: selectedSeason.start_date, end: selectedSeason.end_date }
    : undefined;

  const { data: stats, isLoading } = useGameStats(selectedGame, seasonRange);
  const { data: overview } = useGameStatsOverview();

  return (
    <div>
      {/* Game selector */}
      <div className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-xl border border-border bg-card">
        <Gamepad2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-heading text-muted-foreground mr-1">Game:</span>
        <Select
          value={selectedGame ?? ""}
          onValueChange={(v) => setSelectedGame(v || null)}
        >
          <SelectTrigger className="w-[220px] h-9 text-sm bg-background border-border">
            <SelectValue placeholder="Select a game" />
          </SelectTrigger>
          <SelectContent>
            {(games ?? []).map((g) => (
              <SelectItem key={g.id} value={g.name}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Calendar className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
        <span className="text-sm font-heading text-muted-foreground mr-1">Season:</span>
        <Select
          value={selectedSeasonId ?? "all"}
          onValueChange={(v) => setSelectedSeasonId(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[220px] h-9 text-sm bg-background border-border">
            <SelectValue placeholder="All seasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {(seasons ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.status === "active" ? "(Current)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedGame ? (
        /* Overview grid */
        <div>
          <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            All Games Overview
          </h3>
          {!overview || overview.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg text-foreground mb-2">No game data yet</h3>
              <p className="text-sm text-muted-foreground font-body">
                Statistics will appear once tournaments have been created for games.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.map((item) => (
                <button
                  key={item.game_name}
                  onClick={() => setSelectedGame(item.game_name)}
                  className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/50 transition-colors"
                >
                  <h4 className="font-heading font-semibold text-foreground mb-3 truncate">{item.game_name}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5" />
                      {item.tournament_count} tournaments
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      {item.match_count} matches
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !stats ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-lg text-foreground mb-2">No data available</h3>
          <p className="text-sm text-muted-foreground font-body">No tournaments or matches found for this game.</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StatCard icon={Trophy} label="Tournaments" value={stats.totalTournaments} />
            <StatCard icon={Target} label="Matches Played" value={stats.totalMatches} accent />
            <StatCard icon={Users} label="Unique Players" value={stats.uniquePlayers} />
          </div>

          {/* Top Players Bar Chart */}
          {stats.topPlayers.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 mb-8">
              <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Top Players by Wins
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.topPlayers.slice(0, 10).map((p) => ({
                    name: p.display_name.length > 10 ? p.display_name.slice(0, 10) + "…" : p.display_name,
                    wins: p.wins,
                    losses: p.losses,
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

          {/* Player table */}
          {stats.topPlayers.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Player Leaderboard
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-3 px-2">#</th>
                      <th className="text-left py-3 px-2">Player</th>
                      <th className="text-center py-3 px-2">Matches</th>
                      <th className="text-center py-3 px-2">Wins</th>
                      <th className="text-center py-3 px-2">Losses</th>
                      <th className="text-center py-3 px-2">Win Rate</th>
                      <th className="text-center py-3 px-2">Tournaments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topPlayers.map((p, i) => (
                      <tr key={p.user_id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-display font-bold text-muted-foreground">{i + 1}</td>
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
                        <td className="py-3 px-2 text-center font-display text-foreground">{p.matches}</td>
                        <td className="py-3 px-2 text-center font-display text-success">{p.wins}</td>
                        <td className="py-3 px-2 text-center font-display text-destructive">{p.losses}</td>
                        <td className="py-3 px-2 text-center font-display text-primary">{p.win_rate}%</td>
                        <td className="py-3 px-2 text-center font-display text-muted-foreground">{p.tournaments_played}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GameStatsView;
