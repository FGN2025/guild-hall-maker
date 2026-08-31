import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AgentRun = {
  id: string;
  tenant_id: string;
  launched_by: string;
  mode: string | null;
  archetype: string | null;
  anchor: string | null;
  instruction: string | null;
  status: "running" | "succeeded" | "completed" | "failed";
  /** Structured scope recorded at launch (seed lane). */
  scope: any | null;
  /** Server-computed pre-flight snapshot recorded at launch (seed lane). */
  preflight: any | null;
  failure_kind: string | null;
  target_month: string | null;
  seed_density: string | null;
  range_start: string | null;
  range_end: string | null;
  include_kickoff: boolean | null;
  turn_cap: number;
  turns_used: number;
  input_tokens: number;
  output_tokens: number;
  error_message: string | null;
  created_row_ids: any;
  started_at: string;
  finished_at: string | null;
};

export function useAgentRuns(tenantId?: string, opts?: { pollActive?: boolean }) {
  return useQuery({
    queryKey: ["agent_runs", tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as AgentRun[];
      const { data, error } = await supabase
        .from("agent_runs" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as AgentRun[];
    },
    enabled: !!tenantId,
    refetchInterval: opts?.pollActive ? 3000 : false,
  });
}

export type RunStatusFilter = "all" | "running" | "succeeded" | "failed";

/**
 * Paged run feed for the seed-run dashboard. Polls only while a run is
 * actually active, so an idle dashboard makes no repeated requests.
 */
export function useAgentRunsPaged(
  tenantId?: string,
  opts?: { status?: RunStatusFilter; limit?: number },
) {
  const status = opts?.status ?? "all";
  const limit = opts?.limit ?? 25;

  const query = useQuery({
    queryKey: ["agent_runs_paged", tenantId, status, limit],
    queryFn: async () => {
      if (!tenantId) return { rows: [] as AgentRun[], total: 0 };
      let q = supabase
        .from("agent_runs" as any)
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId);
      if (status === "succeeded") q = q.in("status", ["succeeded", "completed"]);
      else if (status !== "all") q = q.eq("status", status);
      const { data, error, count } = await q
        .order("started_at", { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as AgentRun[], total: count ?? 0 };
    },
    enabled: !!tenantId,
  });

  const hasRunning = (query.data?.rows ?? []).some((r) => r.status === "running");

  // Second, tiny query: totals for the summary strip, independent of the filter.
  const summary = useQuery({
    queryKey: ["agent_runs_summary", tenantId],
    queryFn: async () => {
      if (!tenantId) return { total: 0, succeeded: 0, failed: 0, running: 0 };
      const { data, error } = await supabase
        .from("agent_runs" as any)
        .select("status")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const rows = (data ?? []) as unknown as { status: string }[];
      return {
        total: rows.length,
        succeeded: rows.filter((r) => r.status === "succeeded" || r.status === "completed").length,
        failed: rows.filter((r) => r.status === "failed").length,
        running: rows.filter((r) => r.status === "running").length,
      };
    },
    enabled: !!tenantId,
    refetchInterval: hasRunning ? 3000 : false,
  });

  return { ...query, summary: summary.data, hasRunning };
}

export function useAgentLaunchGate() {
  return useQuery({
    queryKey: ["agent_launches_enabled"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "agent_launches_enabled")
        .maybeSingle();
      const raw = (data as any)?.value;
      return { enabled: raw !== "false", raw };
    },
  });
}
