import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useTenantAdmins } from "@/hooks/useTenants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Trash2, UserCog, Shield, User } from "lucide-react";
import { toast } from "sonner";

const TenantTeam = () => {
  const { user } = useAuth();
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId || "";
  const tenantRole = tenantInfo?.tenantRole;

  const { admins, isLoading, addAdmin, removeAdmin, updateRole } = useTenantAdmins(tenantId);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [addRole, setAddRole] = useState<string>("manager");

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

      // Check if already a team member
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who has access to your tenant admin panel.
        </p>
      </div>

      {/* Add member */}
      <div className="flex gap-2 max-w-lg">
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

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Admin</strong> — Full access: dashboard, leads, ZIP codes, subscribers, and team management.</p>
        <p><strong>Manager</strong> — Read-only access to dashboard and leads.</p>
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
    </div>
  );
};

export default TenantTeam;
