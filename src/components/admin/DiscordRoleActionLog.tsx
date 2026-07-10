import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Status = "success" | "skipped" | "failed" | "retry_pending";

interface LogRow {
  id: string;
  user_id: string | null;
  tournament_id: string | null;
  discord_id: string | null;
  role_id: string | null;
  source: string;
  status: Status;
  reason: string | null;
  http_status: number | null;
  error_message: string | null;
  attempt: number;
  next_retry_at: string | null;
  created_at: string;
}

interface JoinedRow extends LogRow {
  display_name?: string | null;
  tournament_name?: string | null;
}

const FILTERS: Array<{ key: "all" | Status; label: string }> = [
  { key: "all", label: "All" },
  { key: "failed", label: "Failed" },
  { key: "retry_pending", label: "Retry pending" },
  { key: "skipped", label: "Skipped" },
  { key: "success", label: "Success" },
];

function statusBadge(status: Status) {
  const variant =
    status === "success" ? "default"
    : status === "failed" ? "destructive"
    : status === "retry_pending" ? "secondary"
    : "outline";
  return <Badge variant={variant as any}>{status.replace("_", " ")}</Badge>;
}

export default function DiscordRoleActionLog() {
  const [rows, setRows] = useState<JoinedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [checkingBot, setCheckingBot] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discord_role_action_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(`Failed to load log: ${error.message}`);
      setLoading(false);
      return;
    }
    const logRows = (data ?? []) as LogRow[];

    // Enrich with display names / tournament names
    const userIds = Array.from(new Set(logRows.map((r) => r.user_id).filter(Boolean))) as string[];
    const tourIds = Array.from(new Set(logRows.map((r) => r.tournament_id).filter(Boolean))) as string[];

    const [profilesRes, toursRes] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("user_id, display_name").in("user_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      tourIds.length
        ? supabase.from("tournaments").select("id, name").in("id", tourIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const nameByUser = new Map<string, string>();
    (profilesRes.data ?? []).forEach((p: any) => nameByUser.set(p.user_id, p.display_name));
    const nameByTour = new Map<string, string>();
    (toursRes.data ?? []).forEach((t: any) => nameByTour.set(t.id, t.name));

    setRows(
      logRows.map((r) => ({
        ...r,
        display_name: r.user_id ? nameByUser.get(r.user_id) : null,
        tournament_name: r.tournament_id ? nameByTour.get(r.tournament_id) : null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  const failed24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return rows.filter((r) => r.status === "failed" && new Date(r.created_at).getTime() >= cutoff).length;
  }, [rows]);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    const { error } = await supabase.rpc("admin_retry_discord_role_action", { _log_id: id });
    setRetrying(null);
    if (error) return toast.error(`Retry failed: ${error.message}`);
    toast.success("Queued for retry");
    load();
  };

  const handleBotCheck = async () => {
    setCheckingBot(true);
    const { data, error } = await supabase.functions.invoke("discord-server-roles");
    setCheckingBot(false);
    if (error) return toast.error(`Bot check failed: ${error.message}`);
    const bot = (data as any)?.bot;
    const roles = (data as any)?.roles ?? [];
    if (!bot) return toast.warning("Discord returned roles, but couldn't read bot member info.");
    const highest = bot.highest_role_position ?? 0;

    // Check open tournaments' discord_role_id positions
    const { data: tourns } = await supabase
      .from("tournaments")
      .select("name, discord_role_id, status")
      .not("discord_role_id", "is", null)
      .in("status", ["upcoming", "open", "in_progress"] as any)
      .limit(50);

    const problems: string[] = [];
    (tourns ?? []).forEach((t: any) => {
      const role = roles.find((r: any) => r.id === t.discord_role_id);
      if (role && role.position >= highest) {
        problems.push(`${t.name} → role "${role.name}" (pos ${role.position}) is at/above bot (pos ${highest})`);
      }
    });

    if (problems.length === 0) {
      toast.success(`Bot highest role position: ${highest}. All tournament roles are assignable.`);
    } else {
      toast.warning(
        `Bot at position ${highest}, but ${problems.length} tournament role(s) sit at/above it. Move the bot role higher in Discord.`,
        { description: problems.slice(0, 3).join(" · "), duration: 10000 },
      );
    }
  };

  return (
    <div className="rounded-lg border bg-card/90 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Discord Role Assignments</h3>
          {failed24h > 0 && (
            <Badge variant="destructive">{failed24h} failed / 24h</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleBotCheck} disabled={checkingBot}>
            {checkingBot ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
            Check bot permissions
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b px-4 py-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Tournament</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>HTTP</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead>Error / reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                No entries.
              </TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">{r.display_name ?? r.user_id?.slice(0, 8) ?? "—"}</TableCell>
                <TableCell className="text-sm">{r.tournament_name ?? "—"}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-xs">{r.http_status ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.attempt}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={r.error_message ?? r.reason ?? ""}>
                  {r.error_message ?? r.reason ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {r.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(r.id)}
                      disabled={retrying === r.id}
                    >
                      {retrying === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Retry"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
