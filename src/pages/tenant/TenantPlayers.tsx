import { useTenantPlayers } from "@/hooks/useTenantPlayers";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const TenantPlayers = () => {
  const { tenantInfo, isTenantAdmin } = useTenantAdmin();
  const tenantRole = tenantInfo?.tenantRole ?? "manager";
  const tenantId = tenantInfo?.tenantId ?? null;
  const { players, stats, search, setSearch, isLoading } = useTenantPlayers(tenantId);
  const [backfilling, setBackfilling] = useState(false);
  const queryClient = useQueryClient();

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
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackfillZips}
          disabled={backfilling || !tenantId}
        >
          <MapPin className="h-4 w-4 mr-1" />
          {backfilling ? "Extracting…" : "Extract ZIPs from Addresses"}
        </Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No players found.</TableCell>
              </TableRow>
            ) : (
              players.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.gamerTag || "—"}</TableCell>
                  <TableCell>{p.email || "—"}</TableCell>
                  <TableCell>{p.inviteCode || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "matched" ? "default" : "outline"} className="capitalize">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.createdAt ? format(new Date(p.createdAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TenantPlayers;
