import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

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

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
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
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <Label className="font-heading text-sm">Sync Health (last 24h)</Label>
      </div>

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

export default EcosystemSyncHealth;
