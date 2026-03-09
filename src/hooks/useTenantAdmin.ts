import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TenantAdminInfo {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantRole: 'admin' | 'manager' | 'marketing';
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
}

const SELECTED_TENANT_KEY = "fgn_selected_tenant_id";
const TENANT_CHANGE_EVENT = "fgn-tenant-change";

function subscribeTenantStore(callback: () => void) {
  const handler = () => callback();
  window.addEventListener(TENANT_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(TENANT_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getTenantSnapshot(): string | null {
  return localStorage.getItem(SELECTED_TENANT_KEY);
}

export function useTenantAdmin() {
  const { user, isAdmin } = useAuth();
  const selectedTenantId = useSyncExternalStore(subscribeTenantStore, getTenantSnapshot, getTenantSnapshot);

  const setSelectedTenantId = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem(SELECTED_TENANT_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_TENANT_KEY);
    }
    window.dispatchEvent(new Event(TENANT_CHANGE_EVENT));
  }, []);

  // Fetch all active tenants for platform admins
  const { data: allTenants } = useQuery({
    queryKey: ["all-tenants-list"],
    enabled: !!user?.id && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, accent_color")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data || []) as TenantListItem[];
    },
  });

  // Original tenant admin check (for non-platform-admins)
  const { data: tenantAdminData, isLoading: isTenantAdminLoading } = useQuery({
    queryKey: ["tenant-admin-check", user?.id],
    enabled: !!user?.id && !isAdmin,
    queryFn: async () => {
      const { data: adminRows, error } = await supabase
        .from("tenant_admins")
        .select("tenant_id, role")
        .eq("user_id", user!.id);

      if (error) throw error;
      if (!adminRows || adminRows.length === 0) return null;

      const tenantIds = adminRows.map((r: any) => r.tenant_id);
      const { data: tenants, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, accent_color")
        .in("id", tenantIds)
        .eq("status", "active");

      if (tErr) throw tErr;
      if (!tenants || tenants.length === 0) return null;

      const t = tenants[0];
      const matchingAdmin = adminRows.find((r: any) => r.tenant_id === t.id);
      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        tenantRole: (['manager', 'marketing'].includes(matchingAdmin?.role) ? matchingAdmin.role : 'admin') as 'admin' | 'manager' | 'marketing',
        logoUrl: t.logo_url || null,
        primaryColor: (t as any).primary_color || null,
        accentColor: (t as any).accent_color || null,
      } as TenantAdminInfo;
    },
  });

  // Auto-select first tenant for platform admins if none selected
  useEffect(() => {
    if (isAdmin && allTenants && allTenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(allTenants[0].id);
    }
  }, [isAdmin, allTenants, selectedTenantId, setSelectedTenantId]);

  // Build tenantInfo for platform admins from selected tenant
  let tenantInfo: TenantAdminInfo | null = null;
  let isPlatformAdminMode = false;

  if (isAdmin && allTenants) {
    const selected = allTenants.find((t) => t.id === selectedTenantId) || allTenants[0] || null;
    if (selected) {
      isPlatformAdminMode = true;
      tenantInfo = {
        tenantId: selected.id,
        tenantName: selected.name,
        tenantSlug: selected.slug,
        tenantRole: 'admin',
        logoUrl: selected.logo_url,
        primaryColor: selected.primary_color,
        accentColor: selected.accent_color,
      };
    }
  } else if (tenantAdminData) {
    tenantInfo = tenantAdminData;
  }

  const isLoading = isAdmin ? false : isTenantAdminLoading;

  return {
    isTenantAdmin: !!tenantInfo,
    tenantInfo,
    isLoading,
    isPlatformAdminMode,
    allTenants: allTenants || [],
    selectedTenantId,
    setSelectedTenantId,
  };
}
