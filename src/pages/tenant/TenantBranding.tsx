import { useEffect, useState } from "react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useWebPages } from "@/hooks/useWebPages";
import { supabase } from "@/integrations/supabase/client";
import WebPageEditor from "@/components/webpages/WebPageEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Palette } from "lucide-react";
import { toast } from "sonner";

/**
 * Single-page banner editor for a tenant. Auto-creates the banner
 * web_page on first visit, then hands off to the existing WebPageEditor.
 */
const TenantBranding = () => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId ?? null;
  const { pages, isLoadingPages, createPage } = useWebPages(tenantId);
  const [bannerPageId, setBannerPageId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (!tenantId || isLoadingPages) return;

    let cancelled = false;
    (async () => {
      // 1. Look for an existing banner page
      const { data: existing } = await (supabase
        .from("web_pages")
        .select("id")
        .eq("tenant_id", tenantId) as any)
        .eq("is_tenant_banner", true)
        .maybeSingle();

      if (cancelled) return;
      if (existing?.id) {
        setBannerPageId(existing.id);
        setResolving(false);
        return;
      }

      // 2. Create one
      try {
        const created = await createPage.mutateAsync({
          title: "Subscriber Banner",
          slug: `banner-${Date.now()}`,
          tenant_id: tenantId,
          description: "Custom banner shown to your subscribers across the player portal.",
        } as any);

        // Mark it as the tenant banner & publish
        const { error: updErr } = await supabase
          .from("web_pages")
          .update({ is_tenant_banner: true, is_published: true } as any)
          .eq("id", created.id);
        if (updErr) throw updErr;

        if (!cancelled) setBannerPageId(created.id);
      } catch (e) {
        toast.error("Could not initialize banner page");
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tenantId, isLoadingPages]);

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No tenant selected.
        </CardContent>
      </Card>
    );
  }

  if (resolving || !bannerPageId) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" /> Branding & Banner
        </h1>
        <p className="text-sm text-muted-foreground">
          Build a custom banner that your subscribers will see at the top of the player portal.
          Manage your logo and brand colors in <a href="/tenant/settings" className="underline text-primary">Tenant Settings</a>.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading uppercase tracking-widest text-muted-foreground">
            Subscriber Banner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WebPageEditor
            pageId={bannerPageId}
            tenantId={tenantId}
            onBack={() => { /* stay on page */ }}
            tenantBranding={{
              logoUrl: tenantInfo?.logoUrl,
              primaryColor: tenantInfo?.primaryColor,
              accentColor: tenantInfo?.accentColor,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantBranding;
