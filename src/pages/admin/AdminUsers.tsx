import { useState } from "react";
import { useAdminUsers, useTenantsList } from "@/hooks/useAdminUsers";
import { useLegacyUsers, useLegacyUserStats } from "@/hooks/useLegacyUsers";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TableSkeleton from "@/components/ui/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Users, UserCheck, UserX, Mail, Loader2, ShieldAlert, Trash2, Ban, Download, FileText } from "lucide-react";
import { exportTableCSV, exportTablePDF, type ExportColumn } from "@/lib/exportUserData";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);
  const { users, isLoading, setRole, resendConfirmation, deleteUser } = useAdminUsers(search, tenantId);
  const { user: currentUser } = useAuth();

  // Delete / ban confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{ userId: string; ban: boolean } | null>(null);
  const { data: tenants = [] } = useTenantsList();

  // Legacy tab state
  const [legacySearch, setLegacySearch] = useState("");
  const { data: legacyUsers = [], isLoading: legacyLoading } = useLegacyUsers({ tenantId, search: legacySearch });
  const { data: stats } = useLegacyUserStats(tenantId);

  const roleBadge = (role: string | null) => {
    if (role === "admin") return <Badge className="bg-primary/20 text-primary border-primary/30">Admin</Badge>;
    if (role === "moderator") return <Badge className="bg-accent/20 text-accent-foreground border-accent/30">Moderator</Badge>;
    if (role === "marketing") return <Badge className="bg-chart-4/20 text-chart-4 border-chart-4/30">Marketing</Badge>;
    return <Badge variant="secondary">User</Badge>;
  };

  const tenantRoleBadge = (role: string | null) => {
    if (role === "admin") return <Badge className="bg-primary/20 text-primary border-primary/30">Tenant Admin</Badge>;
    if (role === "manager") return <Badge className="bg-secondary text-secondary-foreground">Manager</Badge>;
    if (role === "marketing") return <Badge className="bg-chart-4/20 text-chart-4 border-chart-4/30">Marketing</Badge>;
    return <span className="text-muted-foreground">—</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          User Management
        </h1>
      </div>

      {/* Global tenant filter */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={tenantId ?? "all"} onValueChange={(v) => setTenantId(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[220px] bg-card border-border">
            <SelectValue placeholder="All Tenants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="registered">
        <TabsList>
          <TabsTrigger value="registered">Registered Users</TabsTrigger>
          <TabsTrigger value="legacy">Legacy Users</TabsTrigger>
        </TabsList>

        {/* Registered Users Tab */}
        <TabsContent value="registered" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or tag..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border font-body" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const cols: ExportColumn[] = [
                  { key: "display_name", label: "Display Name" },
                  { key: "gamer_tag", label: "Gamer Tag" },
                  { key: "discord_username", label: "Discord" },
                  { key: "discord_id", label: "Discord ID" },
                  { key: "tenant_name", label: "Tenant" },
                  { key: "role", label: "Role" },
                  { key: "created_at", label: "Joined" },
                ];
                exportTableCSV(users.map(u => ({ ...u, created_at: new Date(u.created_at).toLocaleDateString() })), cols, "registered_users.csv");
              }}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const cols: ExportColumn[] = [
                  { key: "display_name", label: "Display Name" },
                  { key: "gamer_tag", label: "Gamer Tag" },
                  { key: "discord_username", label: "Discord" },
                  { key: "tenant_name", label: "Tenant" },
                  { key: "role", label: "Role" },
                  { key: "created_at", label: "Joined" },
                ];
                exportTablePDF(users.map(u => ({ ...u, created_at: new Date(u.created_at).toLocaleDateString() })), cols, "Registered Users");
              }}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Gamer Tag</TableHead>
                    <TableHead>Discord</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Tenant Role</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Set Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <TableSkeleton columns={8} rows={8} showAvatar />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Gamer Tag</TableHead>
                    <TableHead>Discord</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Tenant Role</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Set Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, idx) => (
                    <TableRow key={u.id} className="animate-fade-in" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">{(u.display_name ?? "?")[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{u.display_name ?? "Unknown"}</span>
                          {!u.has_email ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                              <Mail className="h-3 w-3" />
                              No Email
                            </Badge>
                          ) : !u.email_confirmed && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  Unconfirmed
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>This user has not verified their email</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.gamer_tag ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.discord_id ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{u.discord_username || u.discord_id}</span>
                            </TooltipTrigger>
                            <TooltipContent>ID: {u.discord_id}</TooltipContent>
                          </Tooltip>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.tenant_name ?? "—"}</TableCell>
                      <TableCell>{tenantRoleBadge(u.tenant_role)}</TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.user_id !== currentUser?.id && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={resendConfirmation.isPending || !u.has_email}
                                    onClick={() => resendConfirmation.mutate(u.user_id)}
                                  >
                                    {resendConfirmation.isPending && resendConfirmation.variables === u.user_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Mail className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Resend confirmation email</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    disabled={deleteUser.isPending}
                                    onClick={() => setConfirmAction({ userId: u.user_id, ban: false })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete user</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    disabled={deleteUser.isPending}
                                    onClick={() => setConfirmAction({ userId: u.user_id, ban: true })}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete &amp; permanently ban</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {u.user_id === currentUser?.id ? (
                            <span className="text-xs text-muted-foreground">You</span>
                          ) : (
                            <Select
                              value={u.role ?? "user"}
                              onValueChange={(val) => setRole.mutate({ userId: u.user_id, role: val })}
                              disabled={setRole.isPending}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Legacy Users Tab */}
        <TabsContent value="legacy" className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Legacy</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{stats?.total ?? "—"}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Matched</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-500" />{stats?.matched ?? "—"}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unmatched</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold flex items-center gap-2"><UserX className="h-5 w-5 text-destructive" />{stats?.unmatched ?? "—"}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Verified</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats?.verified ?? "—"}</div></CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search username, email, provider..." value={legacySearch} onChange={(e) => setLegacySearch(e.target.value)} className="pl-9 bg-card border-border" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const cols: ExportColumn[] = [
                  { key: "legacy_username", label: "Username" },
                  { key: "email", label: "Email" },
                  { key: "provider_name", label: "Provider" },
                  { key: "status", label: "Status" },
                  { key: "legacy_created_at", label: "Created" },
                ];
                exportTableCSV(legacyUsers.map(u => ({ ...u, legacy_created_at: u.legacy_created_at ? new Date(u.legacy_created_at).toLocaleDateString() : "" })), cols, "legacy_users.csv");
              }}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const cols: ExportColumn[] = [
                  { key: "legacy_username", label: "Username" },
                  { key: "email", label: "Email" },
                  { key: "provider_name", label: "Provider" },
                  { key: "status", label: "Status" },
                  { key: "legacy_created_at", label: "Created" },
                ];
                exportTablePDF(legacyUsers.map(u => ({ ...u, legacy_created_at: u.legacy_created_at ? new Date(u.legacy_created_at).toLocaleDateString() : "" })), cols, "Legacy Users");
              }}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          {legacyLoading ? (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matched</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <TableSkeleton columns={6} rows={8} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matched</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legacyUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No legacy users found</TableCell></TableRow>
                  ) : legacyUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.legacy_username}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.email || "—"}</TableCell>
                      <TableCell><Badge variant="default" className="text-xs">{u.provider_name || "None"}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={u.status === "verified" ? "default" : "secondary"} className="text-xs">
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.matched_user_id ? <Badge className="bg-green-600 text-xs">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.legacy_created_at ? new Date(u.legacy_created_at).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {legacyUsers.length >= 1000 && (
                <p className="text-center text-xs text-muted-foreground py-2">Showing first 1,000 results. Use search or tenant filter to narrow.</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.ban ? "Ban User Permanently" : "Delete User"}
        description={
          confirmAction?.ban
            ? "This will permanently remove ALL user data and prevent them from ever registering again. This action cannot be undone."
            : "This will permanently remove ALL user data. The user will be able to register again from scratch. This action cannot be undone."
        }
        confirmLabel={confirmAction?.ban ? "Delete & Ban" : "Delete User"}
        variant="destructive"
        onConfirm={() => {
          if (confirmAction) {
            deleteUser.mutate({ userId: confirmAction.userId, ban: confirmAction.ban });
            setConfirmAction(null);
          }
        }}
      />
    </div>
  );
};

export default AdminUsers;
