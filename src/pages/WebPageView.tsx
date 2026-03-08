import { useParams } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import SectionPreview from "@/components/webpages/SectionPreview";
import type { WebPage, WebPageSection } from "@/hooks/useWebPages";

const WebPageView = () => {
  const { tenantSlug, pageSlug } = useParams<{ tenantSlug: string; pageSlug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-web-page", tenantSlug, pageSlug],
    queryFn: async () => {
      // Resolve tenant
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, name, logo_url, primary_color, accent_color")
        .eq("slug", tenantSlug!)
        .eq("status", "active")
        .maybeSingle();

      if (!tenant) throw new Error("Tenant not found");

      const { data: page, error: pageErr } = await supabase
        .from("web_pages")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("slug", pageSlug!)
        .eq("is_published", true)
        .maybeSingle();

      if (pageErr) throw pageErr;
      if (!page) throw new Error("Page not found");

      const { data: sections } = await supabase
        .from("web_page_sections")
        .select("*")
        .eq("page_id", (page as any).id)
        .order("display_order", { ascending: true });

      return {
        tenant,
        page: page as unknown as WebPage,
        sections: (sections ?? []) as unknown as WebPageSection[],
      };
    },
    enabled: !!tenantSlug && !!pageSlug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground">{(error as Error)?.message || "This page does not exist."}</p>
        </div>
      </div>
    );
  }

  const { tenant, page, sections } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header with tenant branding */}
      <header
        className="border-b border-border px-6 py-3 flex items-center gap-3"
        style={tenant.primary_color ? { borderBottomColor: tenant.primary_color } : undefined}
      >
        {tenant.logo_url && (
          <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 rounded object-contain" />
        )}
        <span className="font-display text-sm font-bold tracking-wider" style={tenant.primary_color ? { color: tenant.primary_color } : undefined}>
          {tenant.name}
        </span>
      </header>

      {/* Page title (SEO) */}
      <title>{page.title} — {tenant.name}</title>

      {/* Sections */}
      <main className="max-w-5xl mx-auto">
        {sections.map((s) => (
          <SectionPreview key={s.id} section={s} />
        ))}
        {sections.length === 0 && (
          <div className="py-24 text-center text-muted-foreground">This page has no content yet.</div>
        )}
      </main>
    </div>
  );
};

export default WebPageView;
