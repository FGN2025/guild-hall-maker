import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useWebPages } from "@/hooks/useWebPages";
import { supabase } from "@/integrations/supabase/client";
import WebPageEditor from "@/components/webpages/WebPageEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Tenant Banner builder — single-page editor for the one
 * `is_tenant_banner=true` web_pages row. Auto-creates it on first visit.
 */
const TenantBanner = () => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId ?? null;
  const { pages, isLoadingPages, createPage } = useWebPages(tenantId);
  const queryClient = useQueryClient();

  const [bannerId, setBannerId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (!tenantId || isLoadingPages) return;
    let cancelled = false;
    (async () => {
      const existing = pages.find((p) => (p as any).is_tenant_banner);
      if (existing) {
        if (!cancelled) { setBannerId(existing.id); setResolving(false); }
        return;
      }
      try {
        const created = await createPage.mutateAsync({
          title: "Subscriber Banner",
          slug: `banner-${Date.now()}`,
          tenant_id: tenantId,
          description: "Custom banner shown to your subscribers across the player portal.",
        } as any);
        const { error: updErr } = await supabase
          .from("web_pages")
          .update({ is_tenant_banner: true, is_published: true } as any)
          .eq("id", created.id);
        if (updErr) throw updErr;
        if (!cancelled) {
          setBannerId(created.id);
          queryClient.invalidateQueries({ queryKey: ["web-pages"] });
        }
      } catch (e) {
        toast.error("Could not initialize banner page");
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenantId, isLoadingPages, pages.length]);

  if (!tenantId || !tenantInfo) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No tenant selected.</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 mb-2">
          <Link to="/tenant/branding"><ArrowLeft className="h-4 w-4" /> Branded Assets</Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" /> Tenant Banner
        </h1>
        <p className="text-sm text-muted-foreground">
          A single strip that appears above every player portal page for your subscribers. Only one banner per tenant.
        </p>
      </div>

      {resolving || !bannerId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <WebPageEditor
          key={bannerId}
          pageId={bannerId}
          tenantId={tenantId}
          onBack={() => { /* hub link in header */ }}
          bannerMode
          titleOverride="Configure Banner"
          settingsLabel="Banner Settings"
          tenantBranding={{
            logoUrl: tenantInfo?.logoUrl,
            primaryColor: tenantInfo?.primaryColor,
            accentColor: tenantInfo?.accentColor,
          }}
        />
      )}
    </div>
  );
};

export default TenantBanner;
