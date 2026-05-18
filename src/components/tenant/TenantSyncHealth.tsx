import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface HealthRow {
  data_type: string;
  total: number;
  failures: number;
  last_success: string | null;
  last_error: string | null;
}

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

interface Props {
  tenantId: string;
}

const TenantSyncHealth = ({ tenantId }: Props) => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tenant-sync-health", tenantId],
    enabled: !!tenantId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_tenant_sync_health" as any,
        { _tenant_id: tenantId, _hours: 24 },
      );
      if (error) throw error;
      return ((data || []) as any[])
        .map((r) => ({
          data_type: r.data_type,
          total: Number(r.total ?? 0),
          failures: Number(r.failures ?? 0),
          last_success: r.last_success,
          last_error: r.last_error,
        }))
        .sort((a, b) => a.data_type.localeCompare(b.data_type)) as HealthRow[];
    },
  });

  if (!isLoading && rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <Label className="font-heading text-sm">Ecosystem Sync (last 24h)</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Real-time delivery health for your tenant's events sent to FGN Academy and other ecosystem apps.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map((r) => {
            const healthy = r.failures === 0;
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
                      <AlertTriangle className="h-3 w-3" /> {r.failures} failure{r.failures > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last success: {formatRelative(r.last_success)}
                </div>
                <div className="text-xs text-muted-foreground">Total calls: {r.total}</div>
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

export default TenantSyncHealth;
