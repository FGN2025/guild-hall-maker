import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenants, useTenantAdmins, type TenantInvitation } from "@/hooks/useTenants";
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
import { Plus, Trash2, Building2, Users, UserPlus, Upload, X, MapPin, Search, KeyRound, Mail, Clock, Loader2, ExternalLink, ArrowUpDown, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BulkZipImportDialog } from "@/components/admin/BulkZipImportDialog";
import { ColorPicker } from "@/components/ui/color-picker";
import { toast } from "sonner";
import { resizeImageFile, LOGO_PRESET } from "@/lib/imageResize";

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

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    setUploading(true);
    try {
      const resized = await resizeImageFile(file, LOGO_PRESET);
      const id = tenantId ?? crypto.randomUUID();
      const url = await uploadTenantLogo(resized, id);
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenants, isLoading, error, createTenant, updateTenant, deleteTenant } = useTenants();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", contact_email: "", logo_url: "", primary_color: "", accent_color: "" });
  const [logoUploading, setLogoUploading] = useState(false);
  // Search, filter, and sort
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("name-asc");

  const activeCount = tenants.filter((t) => t.status === "active").length;
  const inactiveCount = tenants.filter((t) => t.status !== "active").length;

  const filteredTenants = tenants
    .filter((t) => {
      if (statusFilter === "active" && t.status !== "active") return false;
      if (statusFilter === "inactive" && t.status === "active") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (t.name?.toLowerCase().includes(q)) || (t.slug?.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "name-asc": return (a.name ?? "").localeCompare(b.name ?? "");
        case "name-desc": return (b.name ?? "").localeCompare(a.name ?? "");
        case "created-desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created-asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "status": {
          if (a.status === "active" && b.status !== "active") return -1;
          if (a.status !== "active" && b.status === "active") return 1;
          return (a.name ?? "").localeCompare(b.name ?? "");
        }
        default: return 0;
      }
    });

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
          <div className="flex items-center gap-2">
            <BulkZipImportDialog tenants={tenants} onComplete={() => {}} refetchTenants={() => queryClient.invalidateQueries({ queryKey: ["tenants"] })} />
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
        </div>

        {/* Search & Filter Bar */}
        {!isLoading && tenants.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All ({tenants.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
                <TabsTrigger value="inactive">Inactive ({inactiveCount})</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[160px] gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
                <SelectItem value="created-desc">Newest</SelectItem>
                <SelectItem value="created-asc">Oldest</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground space-y-3">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-destructive font-medium">Failed to load providers</p>
            <p className="text-sm">{(error as Error).message}</p>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["tenants"] })}>
              Retry
            </Button>
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No providers yet. Create your first one.</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No providers match your search.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTenants.map((t) => (
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
                onManage={() => {
                  localStorage.setItem("fgn_selected_tenant_id", t.id);
                  navigate("/tenant");
                }}
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
            <TenantAdminPanel tenantId={selectedTenantId} tenantName={selectedTenant?.name || "a provider"} />
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
  onManage,
}: {
  tenant: { id: string; name: string; slug: string; logo_url: string | null; contact_email: string | null; status: string; primary_color: string | null; accent_color: string | null; require_subscriber_validation?: boolean };
  onToggleStatus: (checked: boolean) => void;
  onLogoUpdated: (url: string) => void;
  onOpenAdmins: () => void;
  onDelete: () => void;
  onToggleSubscriberValidation: (checked: boolean) => void;
  onManage: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { data: zipCount } = useQuery({
    queryKey: ["tenant-zip-count", t.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tenant_zip_codes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", t.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: codesCount } = useQuery({
    queryKey: ["tenant-codes-count", t.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tenant_codes" as any)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", t.id)
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <div className={`border rounded-lg p-4 bg-card space-y-3 ${t.status !== "active" ? "border-dashed border-muted opacity-60" : "border-border"}`}>
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
          <Button variant="outline" size="sm" className="gap-1" onClick={onManage}>
            <ExternalLink className="h-4 w-4" /> Manage
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={onOpenAdmins}>
            <Users className="h-4 w-4" /> Admins
          </Button>
          <Badge variant="outline" className="gap-1 text-xs">
            <MapPin className="h-3 w-3" /> {zipCount ?? 0} ZIPs
          </Badge>
          <Badge
            variant="outline"
            className="gap-1 text-xs cursor-pointer hover:bg-accent transition-colors"
            onClick={() => {
              localStorage.setItem("fgn_selected_tenant_id", t.id);
              window.location.assign("/tenant/codes");
            }}
          >
            <KeyRound className="h-3 w-3" /> {codesCount ?? 0} Codes
          </Badge>
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              When enabled, new users selecting this provider during signup must verify their identity against the subscriber registry (name + account number) before completing registration.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/* ─── Admin panel with search + invite tabs ─── */
function TenantAdminPanel({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const { admins, isLoading, invitations, addAdmin, removeAdmin, createInvitation, cancelInvitation } = useTenantAdmins(tenantId);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [addRole, setAddRole] = useState("admin");
  const [foundUser, setFoundUser] = useState<{ user_id: string; display_name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a display name to search for.");
      return;
    }
    setSearching(true);
    setFoundUser(null);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .ilike("display_name", `%${searchTerm.trim()}%`)
        .limit(5);

      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        toast.error("No user found matching that name.");
        return;
      }
      const exact = profiles.find(p => p.display_name?.toLowerCase() === searchTerm.trim().toLowerCase());
      setFoundUser(exact || profiles[0]);
      if (!exact && profiles.length > 1) {
        toast.info(`Found ${profiles.length} matches — showing closest.`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!foundUser) return;
    addAdmin.mutate(
      { tenantId, userId: foundUser.user_id, role: addRole },
      { onSuccess: () => { setFoundUser(null); setSearchTerm(""); } }
    );
  };

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    createInvitation.mutate(
      { tenantId, email, role: inviteRole, tenantName },
      { onSuccess: () => { setInviteEmail(""); } }
    );
  };

  const RoleSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
    >
      <option value="admin">Admin</option>
      <option value="manager">Manager</option>
      <option value="marketing">Marketing</option>
    </select>
  );

  return (
    <div className="mt-6 space-y-4">
      <Tabs defaultValue="invite" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="invite" className="flex-1 gap-1">
            <Mail className="h-3.5 w-3.5" /> Invite by Email
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 gap-1">
            <Search className="h-3.5 w-3.5" /> Search Existing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Enter an email address. If they haven't registered yet, the role will be assigned automatically when they sign up.
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <RoleSelect value={inviteRole} onChange={setInviteRole} />
            </div>
            <Button
              onClick={handleInvite}
              disabled={createInvitation.isPending}
              size="sm"
              className="w-full gap-1"
            >
              {createInvitation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              {createInvitation.isPending ? "Sending..." : "Invite"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-3 pt-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search by display name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setFoundUser(null); }}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button size="icon" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {foundUser && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div>
                <p className="text-sm font-medium text-foreground">{foundUser.display_name}</p>
                <p className="text-xs text-muted-foreground">Ready to assign</p>
              </div>
              <div className="flex items-center gap-2">
                <RoleSelect value={addRole} onChange={setAddRole} />
                <Button size="sm" onClick={handleConfirmAdd} disabled={addAdmin.isPending} className="gap-1">
                  <UserPlus className="h-3.5 w-3.5" />
                  {addAdmin.isPending ? "Adding..." : "Add"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFoundUser(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Invitations</h4>
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border bg-card">
              <div>
                <p className="text-sm text-foreground flex items-center gap-2">
                  {inv.email}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                    <Clock className="h-2.5 w-2.5" /> Pending
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {inv.role}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Invited {new Date(inv.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => cancelInvitation.mutate(inv.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Current admins */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : admins.length === 0 && invitations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No admins assigned yet.</p>
      ) : admins.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Members</h4>
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
      ) : null}
    </div>
  );
}
export default AdminTenants;
