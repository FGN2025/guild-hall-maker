import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TenantAdminInfo {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantRole: 'admin' | 'manager';
}

export function useTenantAdmin() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-admin-check", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: adminRows, error } = await supabase
        .from("tenant_admins")
        .select("tenant_id, role")
        .eq("user_id", user!.id);

      if (error) throw error;
      if (!adminRows || adminRows.length === 0) return null;

      // Get tenant details
      const tenantIds = adminRows.map((r: any) => r.tenant_id);
      const { data: tenants, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .in("id", tenantIds)
        .eq("status", "active");

      if (tErr) throw tErr;
      if (!tenants || tenants.length === 0) return null;

      // Return first active tenant (primary)
      const t = tenants[0];
      const matchingAdmin = adminRows.find((r: any) => r.tenant_id === t.id);
      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        tenantRole: (matchingAdmin?.role === 'manager' ? 'manager' : 'admin') as 'admin' | 'manager',
      } as TenantAdminInfo;
    },
  });

  return {
    isTenantAdmin: !!data,
    tenantInfo: data || null,
    isLoading,
  };
}
