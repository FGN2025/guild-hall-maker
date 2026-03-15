import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lead {
  id: string;
  user_id: string;
  tenant_id: string;
  zip_code: string;
  status: string;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name: string | null;
    gamer_tag: string | null;
  };
}

export function useTenantLeads(tenantId: string | null) {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["tenant-leads", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_service_interests")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map((d: any) => d.user_id);
      const { data: profiles } = await (supabase.from as any)("profiles_public")
        .select("user_id, display_name, gamer_tag")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return data.map((row: any) => ({
        ...row,
        profile: profileMap.get(row.user_id) || null,
      })) as Lead[];
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase
        .from("user_service_interests")
        .update({ status })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-leads", tenantId] });
      toast.success("Lead status updated.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update lead status.");
    },
  });

  return { leads, isLoading, updateLeadStatus };
}
