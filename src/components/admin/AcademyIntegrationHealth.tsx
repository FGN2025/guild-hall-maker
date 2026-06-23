import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  GraduationCap,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  KeyRound,
  Webhook,
  ArrowUpDown,
} from "lucide-react";

interface PerType {
  data_type: string;
  total: number;
  failures: number;
  last_success: string | null;
  last_error: string | null;
  last_error_message: string | null;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "error";
  checked_at: string;
  secrets: Record<string, boolean>;
  missing_secrets: string[];
  webhooks: { total: number; active: number; event_types: string[] };
  sync_24h: { success: number; error: number; per_type: PerType[] };
  queue: Record<string, { pending?: number; dead_letter?: number }> | null;
}

const REQUIRED_SECRETS = [
  "ECOSYSTEM_API_KEY",
  "PLAY_WEBHOOK_SECRET",
  "ECOSYSTEM_DISPATCH_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

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

const StatusPill = ({ status }: { status: HealthResponse["status"] }) => {
  if (status === "healthy") {
    return (
      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white">
        <CheckCircle2 className="h-3 w-3" /> Healthy
      </Badge>
    );
  }
  if (status === "degraded") {
    return (
      <Badge className="gap-1 bg-amber-500 hover:bg-amber-500 text-white">
        <AlertTriangle className="h-3 w-3" /> Degraded
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Misconfigured
    </Badge>
  );
};

const AcademyIntegrationHealth = () => {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    const { data: resp, error: invokeErr } = await supabase.functions.invoke(
      "academy-health"
    );
    if (invokeErr) {
      setError(invokeErr.message);
      setData(null);
    } else if ((resp as any)?.error) {
      setError((resp as any).error);
      setData(null);
    } else {
      setData(resp as HealthResponse);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">
            fgn.academy Integration Health
          </Label>
          {data && <StatusPill status={data.status} />}
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-xs text-muted-foreground">
              Checked {formatRelative(data.checked_at)}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchHealth}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded p-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Could not load Academy health: {error}</span>
        </div>
      )}

      {!data && !error && loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking integration…
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Secrets */}
          <div className="rounded border border-border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="font-heading text-xs">Required Secrets</span>
            </div>
            <ul className="space-y-1.5">
              {REQUIRED_SECRETS.map((name) => {
                const ok = data.secrets[name];
                return (
                  <li
                    key={name}
                    className="flex items-center justify-between text-xs"
                  >
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                      {name}
                    </code>
                    {ok ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-emerald-600 border-emerald-600/40"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Set
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Missing
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Webhooks */}
          <div className="rounded border border-border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              <span className="font-heading text-xs">
                Academy Webhooks
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {data.webhooks.active} active / {data.webhooks.total} configured
            </div>
            {data.webhooks.active === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3 w-3" /> No active webhook targeting
                academy
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {data.webhooks.event_types.map((evt) => (
                  <Badge
                    key={evt}
                    variant="secondary"
                    className="text-[10px] font-mono"
                  >
                    {evt}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Sync 24h */}
          <div className="rounded border border-border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-primary" />
              <span className="font-heading text-xs">Sync (last 24h)</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> {data.sync_24h.success}{" "}
                success
              </span>
              <span
                className={`flex items-center gap-1 ${
                  data.sync_24h.error > 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                <XCircle className="h-3 w-3" /> {data.sync_24h.error} error
              </span>
            </div>
            {data.queue && (
              <div className="pt-1 border-t border-border space-y-1">
                <div className="text-[11px] text-muted-foreground font-heading">
                  Queue depth
                </div>
                {Object.entries(data.queue).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="font-mono text-muted-foreground">
                      {k}
                    </span>
                    <span>
                      {v?.pending ?? 0} pending
                      {(v?.dead_letter ?? 0) > 0 && (
                        <span className="text-destructive ml-1">
                          / {v.dead_letter} DLQ
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {data && data.sync_24h.per_type.length > 0 && (
        <div className="rounded border border-border bg-background overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-heading text-muted-foreground border-b border-border">
            <span className="col-span-3">Data type</span>
            <span className="col-span-2 text-right">Calls</span>
            <span className="col-span-2 text-right">Failures</span>
            <span className="col-span-2">Last success</span>
            <span className="col-span-3">Last error</span>
          </div>
          {data.sync_24h.per_type.map((row) => (
            <div
              key={row.data_type}
              className="grid grid-cols-12 gap-2 px-3 py-2 text-xs border-b border-border last:border-b-0"
            >
              <span className="col-span-3 font-mono">{row.data_type}</span>
              <span className="col-span-2 text-right">{row.total}</span>
              <span
                className={`col-span-2 text-right ${
                  row.failures > 0 ? "text-destructive" : ""
                }`}
              >
                {row.failures}
              </span>
              <span className="col-span-2 text-muted-foreground">
                {formatRelative(row.last_success)}
              </span>
              <span
                className="col-span-3 text-muted-foreground truncate"
                title={row.last_error_message ?? ""}
              >
                {row.last_error
                  ? `${formatRelative(row.last_error)} — ${
                      row.last_error_message ?? ""
                    }`
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {data && data.sync_24h.per_type.length === 0 && !error && (
        <p className="text-xs text-muted-foreground">
          No academy sync activity in the last 24h.
        </p>
      )}
    </div>
  );
};

export default AcademyIntegrationHealth;
