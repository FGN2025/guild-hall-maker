import { useTenantPlayers } from "@/hooks/useTenantPlayers";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, Archive, Link2 } from "lucide-react";
import { format } from "date-fns";

const TenantPlayers = () => {
  const { tenantInfo, isTenantAdmin } = useTenantAdmin();
  const tenantRole = tenantInfo?.tenantRole ?? "manager";
  const { players, stats, search, setSearch, isLoading } = useTenantPlayers(tenantInfo?.tenantId ?? null);

  const statCards = [
    { label: "Total Players", value: stats.total, icon: Users },
    { label: "New Players", value: stats.newCount, icon: UserPlus },
    { label: "Legacy Players", value: stats.legacyCount, icon: Archive },
    { label: "Matched", value: stats.matched, icon: Link2 },
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

        <Input
          placeholder="Search by name, gamer tag, email, or ZIP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gamer Tag</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>ZIP</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No players found.</TableCell>
                </TableRow>
              ) : (
                players.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.gamerTag || "—"}</TableCell>
                    <TableCell>{p.email || "—"}</TableCell>
                    <TableCell>{p.zip || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.source === "new" ? "default" : "secondary"}>
                        {p.source === "new" ? "New" : "Legacy"}
                      </Badge>
                    </TableCell>
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
