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
  onboardingCompleted: boolean;
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
        .select("id, name, slug, logo_url, primary_color, accent_color, onboarding_completed")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data || []) as TenantListItem[];
    },
  });

  // Original tenant admin check (for non-platform-admins) — returns ALL memberships
  const { data: tenantMemberships, isLoading: isTenantAdminLoading } = useQuery({
    queryKey: ["tenant-admin-memberships", user?.id],
    enabled: !!user?.id && !isAdmin,
    queryFn: async () => {
      const { data: adminRows, error } = await supabase
        .from("tenant_admins")
        .select("tenant_id, role")
        .eq("user_id", user!.id);

      if (error) throw error;
      if (!adminRows || adminRows.length === 0) return [];

      const tenantIds = adminRows.map((r: any) => r.tenant_id);
      const { data: tenants, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, accent_color, onboarding_completed")
        .in("id", tenantIds)
        .eq("status", "active");

      if (tErr) throw tErr;
      if (!tenants || tenants.length === 0) return [];

      return tenants.map((t: any) => {
        const matchingAdmin = adminRows.find((r: any) => r.tenant_id === t.id);
        return {
          tenantId: t.id,
          tenantName: t.name,
          tenantSlug: t.slug,
          tenantRole: (['manager', 'marketing'].includes(matchingAdmin?.role) ? matchingAdmin.role : 'admin') as 'admin' | 'manager' | 'marketing',
          logoUrl: t.logo_url || null,
          primaryColor: t.primary_color || null,
          accentColor: t.accent_color || null,
          onboardingCompleted: !!t.onboarding_completed,
        } as TenantAdminInfo;
      });
    },
  });

  // Auto-select first tenant for platform admins if none selected
  useEffect(() => {
    if (isAdmin && allTenants && allTenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(allTenants[0].id);
    }
  }, [isAdmin, allTenants, selectedTenantId, setSelectedTenantId]);

  // Auto-select first membership for tenant admins with multiple tenants
  useEffect(() => {
    if (!isAdmin && tenantMemberships && tenantMemberships.length > 0) {
      const hasValidSelection = selectedTenantId && tenantMemberships.some((m) => m.tenantId === selectedTenantId);
      if (!hasValidSelection) {
        setSelectedTenantId(tenantMemberships[0].tenantId);
      }
    }
  }, [isAdmin, tenantMemberships, selectedTenantId, setSelectedTenantId]);

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
        onboardingCompleted: !!(selected as any).onboarding_completed,
      };
    }
  } else if (tenantMemberships && tenantMemberships.length > 0) {
    tenantInfo =
      tenantMemberships.find((m) => m.tenantId === selectedTenantId) || tenantMemberships[0];
  }

  const isLoading = isAdmin ? false : isTenantAdminLoading;

  // For tenant admins with multiple memberships, expose them via allTenants-shape list
  const tenantAdminSwitcherList: TenantListItem[] = (tenantMemberships || []).map((m) => ({
    id: m.tenantId,
    name: m.tenantName,
    slug: m.tenantSlug,
    logo_url: m.logoUrl,
    primary_color: m.primaryColor,
    accent_color: m.accentColor,
  }));

  return {
    isTenantAdmin: !!tenantInfo,
    tenantInfo,
    isLoading,
    isPlatformAdminMode,
    allTenants: isAdmin ? (allTenants || []) : tenantAdminSwitcherList,
    selectedTenantId,
    setSelectedTenantId,
  };
}
