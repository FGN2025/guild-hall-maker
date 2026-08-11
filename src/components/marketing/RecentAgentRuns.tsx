import { useAgentRuns, type AgentRun } from "@/hooks/useAgentRuns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/** Human labels for the classified failure states. */
const FAILURE_LABELS: Record<string, string> = {
  credit_exhausted: "Credits exhausted",
  cpu_budget_exceeded: "CPU budget exceeded",
  auth_failure: "Authentication failed",
  timeout: "Timed out",
  turn_cap_reached: "Turn cap reached",
  rate_limited: "Rate limited",
  unknown: "Failed",
};

/** What the operator should do about each failure state. */
const FAILURE_HINTS: Record<string, string> = {
  credit_exhausted: "Top up the AI credit balance, then re-launch. Nothing was published.",
  cpu_budget_exceeded: "The run exceeded its compute slice. Narrow the date range and re-launch.",
  auth_failure: "The runner token was rejected. Re-launch; if it repeats, contact platform support.",
  timeout: "A tool call stalled. Re-launch — completed drafts are kept and idempotency prevents duplicates.",
  turn_cap_reached: "The run hit its turn cap before finishing. Narrow the range or raise the cap.",
  rate_limited: "The tenant hit its agent rate cap. Try again later.",
  unknown: "See the error detail below.",
};

function counts(created: any) {
  return [
    created?.campaigns?.length ? `${created.campaigns.length} campaign(s)` : null,
    created?.scheduled_posts?.length ? `${created.scheduled_posts.length} post(s)` : null,
    created?.tenant_marketing_assets?.length ? `${created.tenant_marketing_assets.length} asset(s)` : null,
  ].filter(Boolean).join(" · ");
}

/** Scope line: prefers the stored structured scope over free prose. */
function scopeLine(r: AgentRun): string | null {
  const s: any = r.scope;
  if (s?.summary) return String(s.summary);
  if (s?.target_month) {
    return `${s.target_month} · ${s.range_start ?? "?"} → ${s.range_end ?? "?"} · ${s.density ?? "?"} · kickoff ${s.include_kickoff ? "in" : "out"}`;
  }
  if (r.target_month) return `${r.target_month}${r.seed_density ? ` · ${r.seed_density}` : ""}`;
  return null;
}

export default function RecentAgentRuns({ tenantId }: { tenantId: string }) {
  const hasRunning = true;
  const { data: runs = [], isLoading } = useAgentRuns(tenantId, { pollActive: hasRunning });
  if (isLoading) return null;
  if (!runs.length) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent agent runs</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {runs.map((r) => <RunRow key={r.id} run={r} />)}
      </CardContent>
    </Card>
  );
}

function RunRow({ run: r }: { run: AgentRun }) {
  const created = r.created_row_ids ?? {};
  const summary = counts(created);
  const scope = scopeLine(r);
  const running = r.status === "running";
  const pct = r.turn_cap ? Math.min(100, Math.round(((r.turns_used ?? 0) / r.turn_cap) * 100)) : 0;
  const kind = (r as any).failure_kind as string | null | undefined;
  const pf: any = (r as any).preflight;

  return (
    <Collapsible className="border rounded p-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={r.status === "succeeded" || r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
              {r.status === "failed" && kind ? FAILURE_LABELS[kind] ?? "Failed" : r.status}
            </Badge>
            <span className="font-medium">{r.mode ?? "run"}</span>
            {r.archetype && <span className="text-muted-foreground">· {r.archetype}</span>}
            <span className="text-muted-foreground">· {formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}</span>
          </div>

          {scope && <div className="text-xs mt-1"><span className="text-muted-foreground">Scope:</span> {scope}</div>}
          <div className="text-xs text-muted-foreground">
            <span>Instruction:</span> {r.instruction ? r.instruction : <em>none given</em>}
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            {r.turns_used}/{r.turn_cap} turns · {(r.input_tokens ?? 0) + (r.output_tokens ?? 0)} tokens
            {summary && ` · ${summary}`}
          </div>

          {running && (
            <div className="mt-2 space-y-1">
              <Progress value={pct} className="h-1.5" />
              <div className="text-xs text-muted-foreground">
                Working… {r.turns_used}/{r.turn_cap} turns{summary ? ` · created so far: ${summary}` : " · no rows yet"}
              </div>
            </div>
          )}

          {r.status === "failed" && (
            <div className="text-xs text-destructive mt-1">
              {FAILURE_HINTS[kind ?? "unknown"]}
              {r.error_message && <div className="text-muted-foreground break-all mt-0.5">{r.error_message}</div>}
            </div>
          )}
        </div>

        {pf && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm"><ChevronDown className="h-4 w-4" /></Button>
          </CollapsibleTrigger>
        )}
      </div>

      {pf && (
        <CollapsibleContent className="mt-2 border-t pt-2">
          <IntentVsOutput preflight={pf} created={created} />
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

/** Pre-flight snapshot against what actually landed — divergence at a glance. */
function IntentVsOutput({ preflight, created }: { preflight: any; created: any }) {
  const rows: Array<[string, number, number]> = [
    ["Campaigns", preflight?.expected?.campaigns ?? 0, created?.campaigns?.length ?? 0],
    ["Posts", preflight?.expected?.posts ?? 0, created?.scheduled_posts?.length ?? 0],
    ["Assets", preflight?.expected?.assets ?? 0, created?.tenant_marketing_assets?.length ?? 0],
  ];
  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-4 gap-2 font-medium text-muted-foreground">
        <span></span><span>Planned</span><span>Created</span><span>Delta</span>
      </div>
      {rows.map(([label, exp, act]) => {
        const delta = act - exp;
        return (
          <div key={label} className="grid grid-cols-4 gap-2">
            <span>{label}</span><span>{exp}</span><span>{act}</span>
            <span className={delta === 0 ? "text-muted-foreground" : "text-destructive"}>
              {delta === 0 ? "match" : delta > 0 ? `+${delta}` : delta}
            </span>
          </div>
        );
      })}
      {preflight?.kickoff && (
        <p className="text-muted-foreground">
          Kickoff {preflight.kickoff.included ? "included" : "skipped"} · {preflight.kickoff.reason}
        </p>
      )}
      {Array.isArray(preflight?.items) && (
        <p className="text-muted-foreground">{preflight.items.length} event(s) targeted in range.</p>
      )}
    </div>
  );
}
