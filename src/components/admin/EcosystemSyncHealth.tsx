import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, CheckCircle2, Clock, Inbox, Skull } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useTenants } from "@/hooks/useTenants";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface QueueStats {
  pending: number;
  dlq: number;
  oldest_age_seconds: number | null;
  achievement_pending?: number;
  achievement_dlq?: number;
  achievement_oldest_age_seconds?: number | null;
  quest_pending?: number;
  quest_dlq?: number;
  quest_oldest_age_seconds?: number | null;
  task_pending?: number;
  task_dlq?: number;
  task_oldest_age_seconds?: number | null;
  chain_pending?: number;
  chain_dlq?: number;
  chain_oldest_age_seconds?: number | null;
  passport_pending?: number;
  passport_oldest_age_seconds?: number | null;
}

interface HealthRow {
  data_type: string;
  last_success: string | null;
  last_error: string | null;
  failures_24h: number;
  total_24h: number;
}

const EcosystemSyncHealth = () => {
  const [rows, setRows] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("all");
  const { tenants } = useTenants();

  useEffect(() => {
    fetchHealth();
    fetchQueueStats();
    const interval = setInterval(() => {
      fetchHealth();
      fetchQueueStats();
    }, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const fetchQueueStats = async () => {
    const { data, error } = await supabase.rpc("get_academy_queue_stats" as any);
    if (!error && data) setQueueStats(data as unknown as QueueStats);
  };

  const fetchHealth = async () => {
    if (selectedTenantId !== "all") {
      const { data, error } = await supabase.rpc("get_tenant_sync_health" as any, {
        _tenant_id: selectedTenantId,
        _hours: 24,
      });
      if (error) {
        setRows([]);
        setLoading(false);
        return;
      }
      const mapped: HealthRow[] = ((data || []) as any[]).map((r) => ({
        data_type: r.data_type,
        last_success: r.last_success,
        last_error: r.last_error,
        failures_24h: Number(r.failures ?? 0),
        total_24h: Number(r.total ?? 0),
      }));
      setRows(mapped.sort((a, b) => a.data_type.localeCompare(b.data_type)));
      setLoading(false);
      return;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("ecosystem_sync_log")
      .select("data_type, status, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    const grouped: Record<string, HealthRow> = {};
    (data || []).forEach((r: any) => {
      if (!grouped[r.data_type]) {
        grouped[r.data_type] = {
          data_type: r.data_type,
          last_success: null,
          last_error: null,
          failures_24h: 0,
          total_24h: 0,
        };
      }
      const g = grouped[r.data_type];
      g.total_24h += 1;
      if (r.status === "success" && !g.last_success) g.last_success = r.created_at;
      if (r.status !== "success") {
        g.failures_24h += 1;
        if (!g.last_error) g.last_error = r.error_message || "Unknown error";
      }
    });

    setRows(Object.values(grouped).sort((a, b) => a.data_type.localeCompare(b.data_type)));
    setLoading(false);
  };

  const formatRelative = (iso: string | null) => {
    if (!iso) return "Never";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Sync Health (last 24h)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Tenant filter:</Label>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="h-8 w-[200px] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {queueStats && selectedTenantId === "all" && (
        <div className="space-y-3 border-b border-border pb-4">
          <QueueRow
            label="Challenge completions"
            pending={queueStats.pending}
            dlq={queueStats.dlq}
            oldestSec={queueStats.oldest_age_seconds}
          />
          <QueueRow
            label="Achievements"
            pending={queueStats.achievement_pending ?? 0}
            dlq={queueStats.achievement_dlq ?? 0}
            oldestSec={queueStats.achievement_oldest_age_seconds ?? null}
          />
          <QueueRow
            label="Quest completions"
            pending={queueStats.quest_pending ?? 0}
            dlq={queueStats.quest_dlq ?? 0}
            oldestSec={queueStats.quest_oldest_age_seconds ?? null}
          />
          <QueueRow
            label="Challenge tasks"
            pending={queueStats.task_pending ?? 0}
            dlq={queueStats.task_dlq ?? 0}
            oldestSec={queueStats.task_oldest_age_seconds ?? null}
          />
          <QueueRow
            label="Quest chains"
            pending={queueStats.chain_pending ?? 0}
            dlq={queueStats.chain_dlq ?? 0}
            oldestSec={queueStats.chain_oldest_age_seconds ?? null}
          />
          <QueueRow
            label="Passport refreshes"
            pending={queueStats.passport_pending ?? 0}
            dlq={0}
            oldestSec={queueStats.passport_oldest_age_seconds ?? null}
          />
        </div>
      )}


      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sync activity in the last 24 hours.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map((r) => {
            const healthy = r.failures_24h === 0;
            return (
              <div
                key={r.data_type}
                className="border border-border rounded p-3 bg-background space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold">{r.data_type}</span>
                  {healthy ? (
                    <Badge variant="default" className="gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" /> Healthy
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <AlertTriangle className="h-3 w-3" /> {r.failures_24h} failure{r.failures_24h > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last success: {formatRelative(r.last_success)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total calls: {r.total_24h}
                </div>
                {r.last_error && (
                  <div className="text-xs text-destructive truncate" title={r.last_error}>
                    Error: {r.last_error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface QueueRowProps {
  label: string;
  pending: number;
  dlq: number;
  oldestSec: number | null;
}

const QueueRow = ({ label, pending, dlq, oldestSec }: QueueRowProps) => {
  const fmtAge = (s: number | null) =>
    s == null ? "—" : s < 60 ? `${Math.round(s)}s` : `${Math.round(s / 60)}m`;
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="border border-border rounded p-3 bg-background">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Inbox className="h-3 w-3" /> Retry queue
          </div>
          <div className="text-2xl font-semibold mt-1">{pending}</div>
          <div className="text-[10px] text-muted-foreground">pending messages</div>
        </div>
        <div className="border border-border rounded p-3 bg-background">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Skull className="h-3 w-3" /> Dead-letter
          </div>
          <div className={`text-2xl font-semibold mt-1 ${dlq > 0 ? "text-destructive" : ""}`}>
            {dlq}
          </div>
          <div className="text-[10px] text-muted-foreground">failed 3× — needs review</div>
        </div>
        <div className="border border-border rounded p-3 bg-background">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> Oldest pending
          </div>
          <div className="text-2xl font-semibold mt-1">{fmtAge(oldestSec)}</div>
          <div className="text-[10px] text-muted-foreground">waiting to drain</div>
        </div>
      </div>
    </div>
  );
};

export default EcosystemSyncHealth;
