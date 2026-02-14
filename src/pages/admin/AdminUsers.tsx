import { useState } from "react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const { users, isLoading, promoteToAdmin, revokeAdmin } = useAdminUsers(search);
  const { user: currentUser } = useAuth();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          User Management
        </h1>
      </div>

      <div className="relative w-full sm:w-80 mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or tag..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border font-body" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Gamer Tag</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{(u.display_name ?? "?")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.display_name ?? "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.gamer_tag ?? "—"}</TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.user_id === currentUser?.id ? (
                      <span className="text-xs text-muted-foreground">You</span>
                    ) : u.role === "admin" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeAdmin.mutate(u.user_id)}
                        disabled={revokeAdmin.isPending}
                        className="text-destructive hover:text-destructive gap-1"
                      >
                        <ShieldOff className="h-4 w-4" /> Revoke
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => promoteToAdmin.mutate(u.user_id)}
                        disabled={promoteToAdmin.isPending}
                        className="text-primary hover:text-primary gap-1"
                      >
                        <ShieldCheck className="h-4 w-4" /> Make Admin
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
