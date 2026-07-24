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
  status: "running" | "succeeded" | "failed";
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
