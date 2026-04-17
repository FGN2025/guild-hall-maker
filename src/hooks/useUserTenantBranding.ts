import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { WebPageSection } from "@/hooks/useWebPages";

export interface TenantBranding {
  tenantId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  bannerPageId: string | null;
  bannerSections: WebPageSection[];
}

/**
 * Resolves the current user's tenant (staff or linked subscriber) and
 * returns logo, brand colors, and any custom banner page sections.
 * Returns null when the user has no tenant affiliation.
 */
export const useUserTenantBranding = () => {
  const { user, loading: authLoading } = useAuth();

  return useQuery<TenantBranding | null>({
    queryKey: ["user-tenant-branding", user?.id],
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (!user?.id) return null;

      // Resolve tenant via DB helper (admin → subscriber priority)
      const { data: tenantId, error: rpcErr } = await supabase.rpc(
        "get_user_tenant" as any,
        { _user_id: user.id }
      );
      if (rpcErr) throw rpcErr;
      if (!tenantId) return null;

      // Fetch tenant branding fields
      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, accent_color")
        .eq("id", tenantId as string)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!tenant) return null;

      // Look up published banner page
      const { data: bannerPage } = await (supabase
        .from("web_pages")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("is_published", true) as any)
        .eq("is_tenant_banner", true)
        .maybeSingle();

      let bannerSections: WebPageSection[] = [];
      if (bannerPage?.id) {
        const { data: secs } = await supabase
          .from("web_page_sections")
          .select("*")
          .eq("page_id", bannerPage.id)
          .order("display_order", { ascending: true });
        bannerSections = (secs ?? []) as unknown as WebPageSection[];
      }

      return {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logo_url,
        primaryColor: tenant.primary_color,
        accentColor: tenant.accent_color,
        bannerPageId: bannerPage?.id ?? null,
        bannerSections,
      };
    },
  });
};
