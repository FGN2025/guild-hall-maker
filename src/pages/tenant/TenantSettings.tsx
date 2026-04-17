import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Upload, Loader2, Palette } from "lucide-react";
import { resizeImageFile, LOGO_PRESET } from "@/lib/imageResize";
import { ColorPicker } from "@/components/ui/color-picker";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import CloudGamingConfigCard from "@/components/tenant/CloudGamingConfigCard";
import CloudGamingSeatsCard from "@/components/tenant/CloudGamingSeatsCard";
import TenantBillingCard from "@/components/tenant/TenantBillingCard";
import { useTenantCloudGaming } from "@/hooks/useTenantCloudGaming";
import { useTenantBilling } from "@/hooks/useTenantBilling";

const TenantSettings = () => {
  const { tenantInfo, isPlatformAdminMode } = useTenantAdmin();
  const { isAdmin, roleLoading } = useAuth();
  const { config: cloudGamingConfig } = useTenantCloudGaming(tenantInfo?.tenantId);
  const { isSubscribed } = useTenantBilling();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Handle checkout redirect params
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Subscription activated! Your billing is now set up.");
      searchParams.delete("checkout");
      setSearchParams(searchParams, { replace: true });
    } else if (checkout === "canceled") {
      toast.info("Checkout canceled. No charges were made.");
      searchParams.delete("checkout");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (!tenantInfo) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (!contactEmail.trim()) return;
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
    setSavingColors(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          primary_color: primaryColor,
          accent_color: accentColor,
        } as any)
        .eq("id", tenantInfo.tenantId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tenant-admin-check"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Brand colors updated!");
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingColors(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your company branding and contact info.
        </p>
      </div>

      {isAdmin && !isSubscribed && <TenantBillingCard />}

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

      <CloudGamingConfigCard tenantId={tenantInfo.tenantId} />
      {cloudGamingConfig?.is_enabled && (
        <CloudGamingSeatsCard tenantId={tenantInfo.tenantId} />
      )}
    </div>
  );
};

export default TenantSettings;
