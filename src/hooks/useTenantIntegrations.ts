import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  provider_type: string;
  display_name: string | null;
  api_url: string | null;
  additional_config: Record<string, unknown>;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  created_at: string;
}

export const useTenantIntegrations = (tenantId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["tenant-integrations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_integrations")
        .select("id, tenant_id, provider_type, display_name, api_url, additional_config, is_active, last_sync_at, last_sync_status, last_sync_message, created_at")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data as TenantIntegration[];
    },
    enabled: !!tenantId,
  });

  const saveIntegration = useMutation({
    mutationFn: async (integration: {
      tenant_id: string;
      provider_type: string;
      display_name?: string;
      api_url?: string;
      api_key_encrypted?: string;
      additional_config?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from("tenant_integrations").insert([{
        ...integration,
        additional_config: (integration.additional_config ?? {}) as any,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-integrations", tenantId] });
      toast({ title: "Integration saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving integration", description: err.message, variant: "destructive" });
    },
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ id, ...fields }: {
      id: string;
      display_name?: string;
      api_url?: string;
      api_key_encrypted?: string;
      is_active?: boolean;
      additional_config?: Record<string, unknown>;
    }) => {
      const payload: Record<string, unknown> = { ...fields };
      if (fields.additional_config) {
        payload.additional_config = fields.additional_config as any;
      }
      const { error } = await supabase
        .from("tenant_integrations")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-integrations", tenantId] });
      toast({ title: "Integration updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error updating integration", description: err.message, variant: "destructive" });
    },
  });

  const triggerSync = useMutation({
    mutationFn: async ({ integrationId, dryRun, providerType }: { integrationId: string; dryRun?: boolean; providerType?: string }) => {
      const functionName = providerType === "glds" ? "glds-sync" : "nisc-sync";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { integrationId, dryRun },
      });
      if (error) throw error;
      return data as { success: boolean; message?: string; error?: string; count?: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-integrations", tenantId] });
      if (data.success) {
        toast({ title: "Sync complete", description: data.message });
      } else {
        toast({ title: "Sync issue", description: data.error || data.message, variant: "destructive" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  return { integrations, isLoading, saveIntegration, updateIntegration, triggerSync };
};
