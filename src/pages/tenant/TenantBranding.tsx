import { useEffect, useRef, useState } from "react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useWebPages } from "@/hooks/useWebPages";
import { supabase } from "@/integrations/supabase/client";
import WebPageEditor from "@/components/webpages/WebPageEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { Building2, Loader2, Palette, Upload } from "lucide-react";
import { resizeImageFile, LOGO_PRESET } from "@/lib/imageResize";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const TenantBranding = () => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId ?? null;
  const { pages, isLoadingPages, createPage } = useWebPages(tenantId);
  const [bannerPageId, setBannerPageId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#00e5ff");
  const [accentColor, setAccentColor] = useState("#7c3aed");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingColors, setSavingColors] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (tenantInfo) {
      setPreviewUrl(tenantInfo.logoUrl);
      setPrimaryColor(tenantInfo.primaryColor || "#00e5ff");
      setAccentColor(tenantInfo.accentColor || "#7c3aed");
    }
  }, [tenantInfo]);

  useEffect(() => {
    if (!tenantId || isLoadingPages) return;

    let cancelled = false;
    (async () => {
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

        if (!cancelled) setBannerPageId(created.id);
      } catch (e) {
        toast.error("Could not initialize banner page");
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tenantId, isLoadingPages]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantInfo) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }

    setUploading(true);
    try {
      const resized = await resizeImageFile(file, LOGO_PRESET);
      const ext = resized.name.split(".").pop();
      const path = `tenant-logos/${tenantInfo.tenantId}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("app-media").upload(path, resized, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(path);
      const logoUrl = urlData.publicUrl;
      const { error: updateErr } = await supabase.from("tenants").update({ logo_url: logoUrl }).eq("id", tenantInfo.tenantId);
      if (updateErr) throw updateErr;
      setPreviewUrl(logoUrl);
      queryClient.invalidateQueries({ queryKey: ["tenant-admin-check"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Logo updated!");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleSaveEmail = async () => {
    if (!contactEmail.trim() || !tenantInfo) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tenants").update({ contact_email: contactEmail.trim() }).eq("id", tenantInfo.tenantId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Contact email updated!");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleSaveColors = async () => {
    if (!tenantInfo) return;
    setSavingColors(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ primary_color: primaryColor, accent_color: accentColor } as any)
        .eq("id", tenantInfo.tenantId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tenant-admin-check"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Brand colors updated!");
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingColors(false); }
  };

  if (!tenantId || !tenantInfo) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No tenant selected.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" /> Branding &amp; Banner
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your logo, brand colors, company info, and the custom banner subscribers see across the player portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Company Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {previewUrl ? (
                <img src={previewUrl} alt="Tenant logo" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Upload a square logo (PNG, JPG, WebP). Max 500KB.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" /> Brand Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-3">
                <ColorPicker value={primaryColor} onChange={setPrimaryColor} />
                <span className="font-mono text-sm text-muted-foreground">{primaryColor}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-3">
                <ColorPicker value={accentColor} onChange={setAccentColor} />
                <span className="font-mono text-sm text-muted-foreground">{accentColor}</span>
              </div>
            </div>
          </div>
          <Button onClick={handleSaveColors} disabled={savingColors}>
            {savingColors ? "Saving..." : "Save Colors"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Company Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={tenantInfo.tenantName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <div className="flex gap-2">
              <Input type="email" placeholder="admin@company.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <Button onClick={handleSaveEmail} disabled={saving || !contactEmail.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading uppercase tracking-widest text-muted-foreground">
            Subscriber Banner
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resolving || !bannerPageId ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantBranding;
