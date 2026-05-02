import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import usePageTitle from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gamepad2, ExternalLink, CheckCircle2, AlertCircle, Trophy, Timer } from "lucide-react";

const AdminSteamIntegration = () => {
  usePageTitle("Steam Integration");

  // Games with steam_app_id
  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ["admin-steam-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, name, slug, steam_app_id, image_url")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Players with linked Steam accounts
  const { data: linkedPlayers, isLoading: playersLoading } = useQuery({
    queryKey: ["admin-steam-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, steam_id, avatar_url")
        .not("steam_id", "is", null)
        .order("display_name", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Recent Steam auto-verified evidence
  const { data: recentAuto, isLoading: recentLoading } = useQuery({
    queryKey: ["admin-steam-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_evidence")
        .select("id, status, file_type, reviewed_at, reviewer_notes, task_id, enrollment_id")
        .eq("file_type", "steam_auto")
        .order("reviewed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Challenge tasks using Steam verification
  const { data: steamTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["admin-steam-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_tasks")
        .select("id, title, verification_type, steam_achievement_api_name, steam_playtime_minutes, challenge_id")
        .in("verification_type", ["steam_achievement", "steam_playtime"])
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const totalGames = games?.length ?? 0;
    const enabledGames = games?.filter((g) => !!g.steam_app_id).length ?? 0;
    return {
      totalGames,
      enabledGames,
      linkedPlayers: linkedPlayers?.length ?? 0,
      steamTasks: steamTasks?.length ?? 0,
      recentAuto: recentAuto?.length ?? 0,
    };
  }, [games, linkedPlayers, steamTasks, recentAuto]);

  const enabledGames = (games ?? []).filter((g) => !!g.steam_app_id);
  const disabledGames = (games ?? []).filter((g) => !g.steam_app_id);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider">Steam Integration</h1>
          <p className="text-sm text-muted-foreground">
            Consolidated view of Steam-enabled games, linked players, and auto-verified challenge tasks.
          </p>
        </div>
      </div>

      {/* Setup status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Games (total)" value={stats.totalGames} />
          <Stat label="Steam-enabled games" value={stats.enabledGames} icon={CheckCircle2} tone="success" />
          <Stat label="Players w/ Steam linked" value={stats.linkedPlayers} />
          <Stat label="Tasks using Steam" value={stats.steamTasks} icon={Trophy} />
          <Stat label="Recent auto-approvals" value={stats.recentAuto} icon={CheckCircle2} tone="success" />
        </CardContent>
        <CardContent className="text-xs text-muted-foreground border-t pt-3">
          The <code className="px-1 py-0.5 bg-muted rounded">STEAM_API_KEY</code> backend secret powers all auto-verification calls.
          Manage it in Cloud → Secrets.
        </CardContent>
      </Card>

      {/* Steam-enabled games */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" /> Steam-enabled games ({enabledGames.length})
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/games">Manage Games</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {gamesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : enabledGames.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No games have a Steam App ID yet. Add one from <Link to="/admin/games" className="text-primary underline">Games</Link>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Steam App ID</TableHead>
                  <TableHead className="w-32">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enabledGames.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">{g.steam_app_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://store.steampowered.com/app/${g.steam_app_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        Steam <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {disabledGames.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                {disabledGames.length} game{disabledGames.length === 1 ? "" : "s"} without a Steam App ID
              </summary>
              <ul className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {disabledGames.map((g) => (
                  <li key={g.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 text-yellow-400 shrink-0" />
                    {g.name}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Tasks with Steam verification */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Tasks using Steam auto-verification ({steamTasks?.length ?? 0})
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/challenges">Manage Challenges</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (steamTasks?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No challenge tasks are configured for Steam auto-verification.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Criterion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steamTasks!.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <Link to={`/challenge/${t.challenge_id}`} className="hover:text-primary">
                        {t.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {t.verification_type === "steam_achievement" ? (
                        <Badge variant="outline" className="gap-1"><Trophy className="h-3 w-3" /> Achievement</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><Timer className="h-3 w-3" /> Playtime</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {t.verification_type === "steam_achievement"
                        ? t.steam_achievement_api_name
                        : `≥ ${t.steam_playtime_minutes} min`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Linked players */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Players with Steam linked ({stats.linkedPlayers})</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users">Manage Users</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {playersLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (linkedPlayers?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No players have linked their Steam account yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Steam ID</TableHead>
                  <TableHead className="w-32">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedPlayers!.map((p) => (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium">{p.display_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[11px]">{p.steam_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://steamcommunity.com/profiles/${p.steam_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        Steam <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent auto-approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" /> Recent Steam auto-approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (recentAuto?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No Steam auto-approvals recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewed at</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAuto!.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reviewer_notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Stat = ({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon?: typeof CheckCircle2;
  tone?: "success" | "warn";
}) => {
  const toneClass = tone === "success" ? "text-green-400" : tone === "warn" ? "text-yellow-400" : "text-primary";
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className={`h-3 w-3 ${toneClass}`} />}
        {label}
      </div>
      <div className={`text-2xl font-display font-bold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
};

export default AdminSteamIntegration;
