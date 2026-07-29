import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * A player is "ISP-linked" when they belong to a tenant (internet provider) —
 * i.e. they have a tenant_subscribers or tenant_admins record.
 * Redemptions are restricted to these players (enforced in RLS too).
 */
export const useIsIspLinked = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-tenant-link", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_tenant", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });

  return {
    tenantId: data ?? null,
    isIspLinked: !!data,
    isLoading: !!user && isLoading,
  };
};

export default useIsIspLinked;
