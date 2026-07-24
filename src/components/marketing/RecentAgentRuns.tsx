import { useAgentRuns } from "@/hooks/useAgentRuns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function RecentAgentRuns({ tenantId }: { tenantId: string }) {
  const { data: runs = [], isLoading } = useAgentRuns(tenantId);
  if (isLoading) return null;
  if (!runs.length) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent agent runs</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {runs.map((r) => {
          const created = r.created_row_ids ?? {};
          const counts = [
            created.campaigns?.length ? `${created.campaigns.length} campaign(s)` : null,
            created.scheduled_posts?.length ? `${created.scheduled_posts.length} post(s)` : null,
            created.tenant_marketing_assets?.length ? `${created.tenant_marketing_assets.length} asset(s)` : null,
          ].filter(Boolean).join(" · ");
          return (
            <div key={r.id} className="flex items-center justify-between border rounded p-2 text-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "succeeded" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                  <span className="font-medium">{r.mode ?? "run"}</span>
                  {r.archetype && <span className="text-muted-foreground">· {r.archetype}</span>}
                  <span className="text-muted-foreground">· {formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.turns_used}/{r.turn_cap} turns · {r.input_tokens + r.output_tokens} tokens
                  {counts && ` · ${counts}`}
                  {r.error_message && ` · ${r.error_message}`}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
