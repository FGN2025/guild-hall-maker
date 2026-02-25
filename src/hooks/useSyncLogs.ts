import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["tenant-sync-logs", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_sync_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as SyncLogEntry[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`sync-logs-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tenant_sync_logs",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tenant-sync-logs", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return { logs, isLoading };
};
