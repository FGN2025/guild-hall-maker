import { useState, useRef } from "react";
import { useTenants, useTenantAdmins } from "@/hooks/useTenants";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Trash2, Building2, Users, UserPlus, Upload, X } from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { toast } from "sonner";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";

/* ─── Logo upload helper ─── */
async function uploadTenantLogo(file: File, tenantId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `tenant-logos/${tenantId}.${ext}`;
  const { error } = await supabase.storage.from("app-media").upload(filePath, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("app-media").getPublicUrl(filePath);
  return data.publicUrl;
}

/* ─── Inline logo picker component ─── */
function LogoPicker({
  logoUrl,
  onUploaded,
  uploading,
  setUploading,
  tenantId,
}: {
  logoUrl: string | null;
  onUploaded: (url: string) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  tenantId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { getPreset } = useImageLimits();

  const handleFile = async (file: File) => {
    const ok = await validateAndToast(file, getPreset("avatar"));
    if (!ok) return;
    setUploading(true);
    try {
      const id = tenantId ?? crypto.randomUUID();
      const url = await uploadTenantLogo(file, id);
      onUploaded(url);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <div className="relative h-14 w-14 rounded-lg border border-border overflow-hidden">
          <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
          <button
            type="button"
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
            onClick={() => onUploaded("")}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="h-14 w-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="gap-1"
      >
        <Upload className="h-3.5 w-3.5" />
        {uploading ? "Uploading..." : "Upload Logo"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ─── Main page ─── */
const AdminTenants = () => {
  const { tenants, isLoading, createTenant, updateTenant, deleteTenant } = useTenants();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", contact_email: "", logo_url: "", primary_color: "", accent_color: "" });
  const [logoUploading, setLogoUploading] = useState(false);

  // Admin assignment sheet
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const handleCreate = () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required.");
      return;
    }
    createTenant.mutate(
      {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        contact_email: form.contact_email.trim() || undefined,
        logo_url: form.logo_url || undefined,
        primary_color: form.primary_color || undefined,
        accent_color: form.accent_color || undefined,
      },
      {
        onSuccess: () => {
          setForm({ name: "", slug: "", contact_email: "", logo_url: "", primary_color: "", accent_color: "" });
          setCreateOpen(false);
        },
      }
    );
  };

  const autoSlug = (name: string) => {
    setForm({
      ...form,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    });
  };

  const handleInlineLogoUpdate = async (tenantId: string, url: string) => {
    updateTenant.mutate({ id: tenantId, logo_url: url || null });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Tenants</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage broadband service providers and their admins.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">New Provider</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <LogoPicker
                    logoUrl={form.logo_url || null}
                    onUploaded={(url) => setForm({ ...form, logo_url: url })}
                    uploading={logoUploading}
                    setUploading={setLogoUploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    placeholder="Acme Broadband"
                    value={form.name}
                    onChange={(e) => autoSlug(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    placeholder="acme-broadband"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">URL-friendly identifier</p>
                </div>
                <div className="space-y-2">
                  <Label>Contact Email (optional)</Label>
                  <Input
                    type="email"
                    placeholder="admin@acme.com"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brand Colors (optional)</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <ColorPicker value={form.primary_color || "#00e5ff"} onChange={(c) => setForm({ ...form, primary_color: c })} />
                      <span className="text-xs text-muted-foreground">Primary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPicker value={form.accent_color || "#7c3aed"} onChange={(c) => setForm({ ...form, accent_color: c })} />
                      <span className="text-xs text-muted-foreground">Accent</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={createTenant.isPending || logoUploading}
                  className="w-full"
                >
                  {createTenant.isPending ? "Creating..." : "Create Provider"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No providers yet. Create your first one.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tenants.map((t) => (
              <TenantCard
                key={t.id}
                tenant={t}
                onToggleStatus={(checked) =>
                  updateTenant.mutate({ id: t.id, status: checked ? "active" : "inactive" })
                }
                onLogoUpdated={(url) => handleInlineLogoUpdate(t.id, url)}
                onOpenAdmins={() => setSelectedTenantId(t.id)}
                onDelete={() => deleteTenant.mutate(t.id)}
                onToggleSubscriberValidation={(checked) =>
                  updateTenant.mutate({ id: t.id, require_subscriber_validation: checked })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Admin assignment sheet */}
      <Sheet open={!!selectedTenantId} onOpenChange={(open) => !open && setSelectedTenantId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="font-display">
              {selectedTenant?.name} — Admins
            </SheetTitle>
          </SheetHeader>
          {selectedTenantId && (
            <TenantAdminPanel tenantId={selectedTenantId} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

/* ─── Tenant card with inline logo edit ─── */
function TenantCard({
  tenant: t,
  onToggleStatus,
  onLogoUpdated,
  onOpenAdmins,
  onDelete,
  onToggleSubscriberValidation,
}: {
  tenant: { id: string; name: string; slug: string; logo_url: string | null; contact_email: string | null; status: string; primary_color: string | null; accent_color: string | null; require_subscriber_validation?: boolean };
  onToggleStatus: (checked: boolean) => void;
  onLogoUpdated: (url: string) => void;
  onOpenAdmins: () => void;
  onDelete: () => void;
  onToggleSubscriberValidation: (checked: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LogoPicker
            logoUrl={t.logo_url}
            onUploaded={onLogoUpdated}
            uploading={uploading}
            setUploading={setUploading}
            tenantId={t.id}
          />
          <div>
            <h3 className="font-heading font-semibold text-foreground">{t.name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              /{t.slug}
              {t.contact_email && ` · ${t.contact_email}`}
              {(t.primary_color || t.accent_color) && (
                <span className="inline-flex gap-1 ml-1">
                  {t.primary_color && <span className="h-3 w-3 rounded-full border border-border inline-block" style={{ backgroundColor: t.primary_color }} />}
                  {t.accent_color && <span className="h-3 w-3 rounded-full border border-border inline-block" style={{ backgroundColor: t.accent_color }} />}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={t.status === "active" ? "default" : "secondary"}>
            {t.status}
          </Badge>
          <Switch checked={t.status === "active"} onCheckedChange={onToggleStatus} />
          <Button variant="outline" size="sm" className="gap-1" onClick={onOpenAdmins}>
            <Users className="h-4 w-4" /> Admins
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-1 border-t border-border pt-2">
        <Switch
          id={`sub-val-${t.id}`}
          checked={!!t.require_subscriber_validation}
          onCheckedChange={onToggleSubscriberValidation}
        />
        <Label htmlFor={`sub-val-${t.id}`} className="text-xs text-muted-foreground cursor-pointer">
          Require subscriber validation on signup
        </Label>
      </div>
    </div>
  );
}

/* ─── Admin panel (unchanged logic) ─── */
function TenantAdminPanel({ tenantId }: { tenantId: string }) {
  const { admins, isLoading, addAdmin, removeAdmin } = useTenantAdmins(tenantId);
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [addRole, setAddRole] = useState("admin");

  const handleAdd = async () => {
    if (!email.trim()) {
      toast.error("Please enter a display name to search for.");
      return;
    }
    setSearching(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .or(`display_name.ilike.%${email.trim()}%`)
        .limit(1);

      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        toast.error("No user found matching that name. They must have an account first.");
        return;
      }

      addAdmin.mutate({ tenantId, userId: profiles[0].user_id, role: addRole });
      setEmail("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by display name..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <select
          value={addRole}
          onChange={(e) => setAddRole(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
        </select>
        <Button
          size="icon"
          onClick={handleAdd}
          disabled={searching || addAdmin.isPending}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground">No admins assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
            >
              <div>
                <p className="font-heading text-sm text-foreground flex items-center gap-2">
                  {a.profile?.display_name || "Unknown"}
                  <Badge variant={a.role === "admin" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                    {a.role || "admin"}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Added {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAdmin.mutate(a.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminTenants;
