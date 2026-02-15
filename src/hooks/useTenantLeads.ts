import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data: profiles } = await supabase
        .from("profiles")
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

  return { leads, isLoading };
}
