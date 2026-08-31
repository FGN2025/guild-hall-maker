import { useAgentRuns } from "@/hooks/useAgentRuns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AgentRunRow from "./AgentRunRow";

export default function RecentAgentRuns({ tenantId }: { tenantId: string }) {
  const hasRunning = true;
  const { data: runs = [], isLoading } = useAgentRuns(tenantId, { pollActive: hasRunning });
  if (isLoading) return null;
  if (!runs.length) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent agent runs</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {runs.map((r) => <AgentRunRow key={r.id} run={r} />)}
      </CardContent>
    </Card>
  );
}
