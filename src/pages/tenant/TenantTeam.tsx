import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useTenantAdmins } from "@/hooks/useTenants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Trash2, UserCog, Shield, User, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

const TenantTeam = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId || "";
  const tenantRole = tenantInfo?.tenantRole;

  const { admins, isLoading, addAdmin, removeAdmin, updateRole } = useTenantAdmins(tenantId);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [addRole, setAddRole] = useState<string>("manager");

  // Invite-by-email state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("manager");
  const [sendingInvite, setSendingInvite] = useState(false);

  // Pending invitations query
  const { data: pendingInvites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ["tenant-invitations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_invitations")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("claimed_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  // Only admins can access this page
  if (tenantRole === "manager") {
    return <Navigate to="/tenant" replace />;
  }

  const handleAdd = async () => {
    if (!search.trim()) {
      toast.error("Please enter a display name to search for.");
      return;
    }
    setSearching(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .or(`display_name.ilike.%${search.trim()}%`)
        .limit(1);

      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        toast.error("No user found matching that name.");
        return;
      }

      const existing = admins.find((a) => a.user_id === profiles[0].user_id);
      if (existing) {
        toast.error("This user is already a team member.");
        return;
      }

      addAdmin.mutate({ tenantId, userId: profiles[0].user_id, role: addRole });
      setSearch("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    // Check if already a pending invite
    const alreadyPending = pendingInvites.some(
      (inv: any) => inv.email.toLowerCase() === email
    );
    if (alreadyPending) {
      toast.error("An invitation is already pending for this email.");
      return;
    }

    setSendingInvite(true);
    try {
      // Insert invitation row
      const { error: insertErr } = await supabase
        .from("tenant_invitations")
        .insert({
          tenant_id: tenantId,
          email,
          role: inviteRole,
          invited_by: user?.id,
        });
      if (insertErr) throw insertErr;

      // Send invite email via edge function
      const tenantName = tenantInfo?.tenantName || "your organization";
      const { error: fnErr } = await supabase.functions.invoke("send-tenant-invite", {
        body: { email, tenantName, role: inviteRole, invitedBy: user?.id },
      });
      if (fnErr) console.error("Invite email error (non-blocking):", fnErr);

      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      setInviteEmail("");
      toast.success(`Invitation sent to ${email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation.");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("tenant_invitations")
        .delete()
        .eq("id", inviteId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      toast.success("Invitation revoked.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who has access to your tenant admin dashboard.
        </p>
      </div>

      {/* Add member */}
      <Tabs defaultValue="search" className="max-w-lg">
        <TabsList>
          <TabsTrigger value="search">
            <UserPlus className="h-4 w-4 mr-1.5" />
            Search User
          </TabsTrigger>
          <TabsTrigger value="invite">
            <Mail className="h-4 w-4 mr-1.5" />
            Invite by Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <div className="flex gap-2">
            <Input
              placeholder="Search by display name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Select value={addRole} onValueChange={setAddRole}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="icon"
              onClick={handleAdd}
              disabled={searching || addAdmin.isPending}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The user must already have a registered account.
          </p>
        </TabsContent>

        <TabsContent value="invite">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="icon"
              onClick={handleInvite}
              disabled={sendingInvite}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Send an invite to someone who hasn't registered yet. Their role will be assigned automatically when they sign up.
          </p>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Admin</strong> — Full access: dashboard, leads, ZIP codes, subscribers, and team management.</p>
        <p><strong>Manager</strong> — Read-only access to dashboard and leads.</p>
        <p><strong>Marketing</strong> — Access to marketing assets and media library.</p>
      </div>

      {/* Team list */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : admins.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No team members yet.</p>
        </div>
      ) : (
        <div className="space-y-2 max-w-lg">
          {admins.map((a) => {
            const isCurrentUser = a.user_id === user?.id;
            return (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3">
                  {a.role === "admin" ? (
                    <Shield className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-heading text-sm text-foreground">
                      {a.profile?.display_name || "Unknown"}
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground ml-2">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isCurrentUser ? (
                    <>
                      <Select
                        value={a.role}
                        onValueChange={(val) => updateRole.mutate({ id: a.id, role: val })}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAdmin.mutate(a.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline">{a.role}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2 max-w-lg">
          <h2 className="font-heading text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Pending Invitations
          </h2>
          {pendingInvites.map((inv: any) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border bg-card/50"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited {new Date(inv.created_at).toLocaleDateString()} · {inv.role}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRevokeInvite(inv.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantTeam;
