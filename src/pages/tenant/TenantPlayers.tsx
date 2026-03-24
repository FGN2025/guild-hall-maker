import { useTenantPlayers } from "@/hooks/useTenantPlayers";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, MapPin, Download, FileText, Pencil, Trash2, Ban } from "lucide-react";
import { exportTableCSV, exportTablePDF, type ExportColumn } from "@/lib/exportUserData";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import EditPlayerDialog from "@/components/tenant/EditPlayerDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { UnifiedPlayer } from "@/hooks/useTenantPlayers";

const TenantPlayers = () => {
  const { tenantInfo } = useTenantAdmin();
  const tenantRole = tenantInfo?.tenantRole ?? "manager";
  const isAdmin = tenantRole === "admin";
  const tenantId = tenantInfo?.tenantId ?? null;
  const { players, stats, search, setSearch, isLoading, updateLegacyPlayer, deleteLegacyPlayer, deleteLead, banPlayer } = useTenantPlayers(tenantId);
  const [backfilling, setBackfilling] = useState(false);
  const queryClient = useQueryClient();

  // Edit/Delete/Ban state
  const [editPlayer, setEditPlayer] = useState<UnifiedPlayer | null>(null);
  const [deletePlayer, setDeletePlayer] = useState<UnifiedPlayer | null>(null);
  const [banTarget, setBanTarget] = useState<UnifiedPlayer | null>(null);

  const handleBackfillZips = async () => {
    if (!tenantId) return;
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-legacy-zips", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      toast({
        title: "ZIP Backfill Complete",
        description: data?.message || `Updated ${data?.updated ?? 0} record(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ["tenant-players-legacy", tenantId] });
    } catch (err: any) {
      toast({
        title: "Backfill Failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setBackfilling(false);
    }
  };

  const handleDeletePlayer = () => {
    if (!deletePlayer) return;
    if (deletePlayer.source === "legacy") {
      deleteLegacyPlayer.mutate(deletePlayer.id, { onSuccess: () => setDeletePlayer(null) });
    } else {
      deleteLead.mutate(deletePlayer.id, { onSuccess: () => setDeletePlayer(null) });
    }
  };

  const handleBanPlayer = () => {
    if (!banTarget?.email) return;
    banPlayer.mutate({ email: banTarget.email }, { onSuccess: () => setBanTarget(null) });
  };

  const statCards = [
    { label: "Total Players", value: stats.total, icon: Users },
    { label: "New Leads", value: stats.newCount, icon: UserPlus },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold tracking-wider">Players</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search by name, gamer tag, email, or invite code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" size="sm" onClick={handleBackfillZips} disabled={backfilling || !tenantId}>
          <MapPin className="h-4 w-4 mr-1" />
          {backfilling ? "Extracting…" : "Extract ZIPs from Addresses"}
        </Button>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => {
            const cols: ExportColumn[] = [
              { key: "name", label: "Name" },
              { key: "gamerTag", label: "Gamer Tag" },
              { key: "email", label: "Email" },
              { key: "inviteCode", label: "Invite Code" },
              { key: "status", label: "Status" },
              { key: "createdAt", label: "Registered" },
            ];
            exportTableCSV(players.map(p => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "" })), cols, "tenant_players.csv");
          }}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const cols: ExportColumn[] = [
              { key: "name", label: "Name" },
              { key: "gamerTag", label: "Gamer Tag" },
              { key: "email", label: "Email" },
              { key: "inviteCode", label: "Invite Code" },
              { key: "status", label: "Status" },
              { key: "createdAt", label: "Registered" },
            ];
            exportTablePDF(players.map(p => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "" })), cols, "Tenant Players");
          }}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gamer Tag</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Invite Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">No players found.</TableCell>
              </TableRow>
            ) : (
              players.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.gamerTag || "—"}</TableCell>
                  <TableCell>{p.email || "—"}</TableCell>
                  <TableCell>{p.inviteCode || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "matched" ? "default" : "outline"} className="capitalize">{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.createdAt ? format(new Date(p.createdAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        {p.source === "legacy" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditPlayer(p)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletePlayer(p)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {p.source === "new" && p.email && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setBanTarget(p)} title="Ban">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditPlayerDialog
        open={!!editPlayer}
        onOpenChange={(open) => { if (!open) setEditPlayer(null); }}
        player={editPlayer}
        onSave={(id, fields) => updateLegacyPlayer.mutate({ id, fields }, { onSuccess: () => setEditPlayer(null) })}
        isSaving={updateLegacyPlayer.isPending}
      />

      <ConfirmDialog
        open={!!deletePlayer}
        onOpenChange={(open) => { if (!open) setDeletePlayer(null); }}
        title="Delete Player"
        description={`Remove "${deletePlayer?.name}" permanently? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeletePlayer}
      />

      <ConfirmDialog
        open={!!banTarget}
        onOpenChange={(open) => { if (!open) setBanTarget(null); }}
        title="Ban Player"
        description={`Ban "${banTarget?.name}" (${banTarget?.email})? This will prevent them from re-registering on the platform.`}
        confirmLabel="Ban"
        variant="destructive"
        onConfirm={handleBanPlayer}
      />
    </div>
  );
};

export default TenantPlayers;
