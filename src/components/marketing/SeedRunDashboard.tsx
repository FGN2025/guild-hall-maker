import { useState } from "react";
import { useAgentRunsPaged, type RunStatusFilter } from "@/hooks/useAgentRuns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, CheckCircle2, XCircle, Loader2, CircleSlash2, Gauge } from "lucide-react";
import AgentRunRow from "./AgentRunRow";

const FILTERS: { value: RunStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "blocked", label: "Blocked" },
];

export default function SeedRunDashboard({ tenantId }: { tenantId?: string }) {
  const [status, setStatus] = useState<RunStatusFilter>("all");
  const [limit, setLimit] = useState(25);
  const { data, isLoading, summary, reliability } = useAgentRunsPaged(tenantId, { status, limit });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const stats = [
    { label: "Total runs", value: summary?.total ?? 0, icon: Rocket, color: "text-primary" },
    { label: "Succeeded", value: summary?.succeeded ?? 0, icon: CheckCircle2, color: "text-primary" },
    { label: "Failed", value: summary?.failed ?? 0, icon: XCircle, color: "text-destructive" },
    { label: "Blocked", value: summary?.blocked ?? 0, icon: CircleSlash2, color: "text-amber-400" },
    { label: "Running", value: summary?.running ?? 0, icon: Loader2, color: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4">
              <CardTitle className="text-xs font-heading text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color} ${s.label === "Running" && (summary?.running ?? 0) > 0 ? "animate-spin" : ""}`} />
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-display font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm">
          <span className="flex items-center gap-2 font-medium"><Gauge className="h-4 w-4 text-primary" />Trailing ten seed runs</span>
          <span><strong>{reliability?.complete ?? 0}/{reliability?.sampleSize ?? 0}</strong> reliable and complete</span>
          <span><strong>{reliability?.successful ?? 0}</strong> successful exits</span>
          <span><strong>{reliability?.averageCompleteness == null ? "—" : `${Math.round(reliability.averageCompleteness * 100)}%`}</strong> average completeness</span>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={status === f.value ? "default" : "outline"}
            className="min-h-[36px]"
            onClick={() => { setStatus(f.value); setLimit(25); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Seed runs</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading runs…</p>}
          {!isLoading && !rows.length && (
            <p className="text-sm text-muted-foreground">
              {status === "all"
                ? "No seed runs yet — launch one from the Review tab."
                : `No ${status} runs.`}
            </p>
          )}
          {rows.map((r) => <AgentRunRow key={r.id} run={r} showStartTime />)}
          {rows.length < total && (
            <Button variant="outline" className="w-full min-h-[44px]" onClick={() => setLimit((l) => l + 25)}>
              Load more ({total - rows.length} older)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
