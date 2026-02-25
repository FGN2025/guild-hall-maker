import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SyncLogEntry {
  id: string;
  tenant_id: string;
  integration_id: string;
  provider_type: string;
  status: string;
  message: string | null;
  records_synced: number;
  dry_run: boolean;
  triggered_by: string | null;
  created_at: string;
}

export const useSyncLogs = (tenantId: string | undefined) => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["tenant-sync-logs", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_sync_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SyncLogEntry[];
    },
    enabled: !!tenantId,
  });

  return { logs, isLoading };
};
