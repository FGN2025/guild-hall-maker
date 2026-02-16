import { useState } from "react";
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
import { Plus, Trash2, Building2, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";

const AdminTenants = () => {
  const { tenants, isLoading, createTenant, updateTenant, deleteTenant } = useTenants();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", contact_email: "" });

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
      },
      {
        onSuccess: () => {
          setForm({ name: "", slug: "", contact_email: "" });
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
                <Button
                  onClick={handleCreate}
                  disabled={createTenant.isPending}
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
              <div
                key={t.id}
                className="border border-border rounded-lg p-4 flex items-center justify-between bg-card"
              >
                <div className="flex items-center gap-4">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt={t.name}
                      className="h-10 w-10 rounded object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      /{t.slug}
                      {t.contact_email && ` · ${t.contact_email}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={t.status === "active" ? "default" : "secondary"}>
                    {t.status}
                  </Badge>
                  <Switch
                    checked={t.status === "active"}
                    onCheckedChange={(checked) =>
                      updateTenant.mutate({
                        id: t.id,
                        status: checked ? "active" : "inactive",
                      })
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setSelectedTenantId(t.id)}
                  >
                    <Users className="h-4 w-4" /> Admins
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTenant.mutate(t.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
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
      // Look up profile by matching display_name or searching profiles
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
