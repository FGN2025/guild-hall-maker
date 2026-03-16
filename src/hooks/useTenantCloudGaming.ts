import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TenantCloudGamingConfig {
  id: string;
  tenant_id: string;
  is_enabled: boolean;
  max_seats: number;
  subscription_tier: string;
  blacknut_account_id: string | null;
  created_at: string;
}

export const useTenantCloudGaming = (tenantId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ["tenant-cloud-gaming", tenantId];

  const { data: config, isLoading } = useQuery({
    queryKey,
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_cloud_gaming")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as TenantCloudGamingConfig | null;
    },
  });

  const upsertConfig = useMutation({
    mutationFn: async (updates: {
      is_enabled?: boolean;
      max_seats?: number;
      subscription_tier?: string;
      blacknut_account_id?: string | null;
    }) => {
      if (config) {
        const { error } = await supabase
          .from("tenant_cloud_gaming")
          .update(updates)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tenant_cloud_gaming")
          .insert({ tenant_id: tenantId!, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Cloud gaming settings updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Seat usage count
  const { data: activeSeats = 0 } = useQuery({
    queryKey: ["cloud-gaming-seats-count", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("subscriber_cloud_access")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId!)
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
  });

  return { config, isLoading, upsertConfig, activeSeats };
};
