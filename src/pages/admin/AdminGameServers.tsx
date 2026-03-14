import { useState } from "react";
import { useAdminGameServers, useCreateServer, useUpdateServer, useDeleteServer, useServerStatus, type GameServer, type GameServerInput } from "@/hooks/useGameServers";
import { useGames } from "@/hooks/useGames";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Server, Activity, Copy, Megaphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EventPromoEditorDialog, buildServerPromo } from "@/components/marketing/EventPromoEditor";

const emptyForm: GameServerInput = {
  name: "", game: "", game_id: null, ip_address: "", port: null, description: null,
  image_url: null, max_players: null, connection_instructions: null,
  panel_type: null, panel_url: null, panel_server_id: null,
  is_active: true, display_order: 0,
};

function ServerFormDialog({ open, onOpenChange, initial, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  initial: GameServerInput; onSubmit: (v: GameServerInput) => void; loading: boolean;
}) {
  const [form, setForm] = useState<GameServerInput>(initial);
  const { data: games = [] } = useGames();
  const set = (k: keyof GameServerInput, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleGameSelect = (gameId: string) => {
    if (gameId === "__none__") {
      set("game_id", null);
      set("game", "");
      return;
    }
    const g = games.find(g => g.id === gameId);
    if (g) {
      setForm(prev => ({ ...prev, game_id: g.id, game: g.name }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial.name ? "Edit Server" : "Add Server"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div>
            <Label>Game *</Label>
            <Select value={form.game_id ?? "__none__"} onValueChange={handleGameSelect}>
              <SelectTrigger><SelectValue placeholder="Select a game…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Select a game —</SelectItem>
                {games.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>IP Address *</Label><Input value={form.ip_address} onChange={e => set("ip_address", e.target.value)} /></div>
            <div><Label>Port</Label><Input type="number" value={form.port ?? ""} onChange={e => set("port", e.target.value ? Number(e.target.value) : null)} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={e => set("description", e.target.value || null)} /></div>
          <div><Label>Connection Instructions</Label><Textarea value={form.connection_instructions ?? ""} onChange={e => set("connection_instructions", e.target.value || null)} placeholder="How players should connect..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Image URL</Label><Input value={form.image_url ?? ""} onChange={e => set("image_url", e.target.value || null)} /></div>
            <div><Label>Max Players</Label><Input type="number" value={form.max_players ?? ""} onChange={e => set("max_players", e.target.value ? Number(e.target.value) : null)} /></div>
          </div>
          <div><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={e => set("display_order", Number(e.target.value))} /></div>

          <div className="border-t border-border pt-4">
            <h4 className="font-heading font-medium text-sm mb-3">Panel Integration (Optional)</h4>
            <div className="flex items-center gap-2 mb-3">
              <Switch checked={form.panel_type === "pterodactyl"} onCheckedChange={c => set("panel_type", c ? "pterodactyl" : null)} />
              <Label>Pterodactyl Panel</Label>
            </div>
            {form.panel_type === "pterodactyl" && (
              <div className="grid gap-3">
                <div><Label>Panel URL</Label><Input value={form.panel_url ?? ""} onChange={e => set("panel_url", e.target.value || null)} placeholder="https://panel.example.com" /></div>
                <div><Label>Panel Server ID</Label><Input value={form.panel_server_id ?? ""} onChange={e => set("panel_server_id", e.target.value || null)} placeholder="abc123" /></div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={c => set("is_active", c)} />
            <Label>Active</Label>
          </div>

          <Button disabled={loading || !form.name || !form.game || !form.ip_address} onClick={() => onSubmit(form)}>
            {initial.name ? "Save Changes" : "Add Server"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusCell({ server }: { server: GameServer }) {
  const [checkEnabled, setCheckEnabled] = useState(false);
  const { data, isLoading } = useServerStatus(server.id, checkEnabled);

  if (!server.panel_type) return <span className="text-muted-foreground text-xs">No panel</span>;
  if (!checkEnabled) return <Button variant="ghost" size="sm" onClick={() => setCheckEnabled(true)}><Activity className="h-4 w-4 mr-1" />Check</Button>;
  if (isLoading) return <span className="text-xs text-muted-foreground">Checking...</span>;
  if (!data || data.is_online === null) return <span className="text-xs text-muted-foreground">N/A</span>;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${data.is_online ? "text-green-500" : "text-destructive"}`}>
      <span className={`h-2 w-2 rounded-full ${data.is_online ? "bg-green-500" : "bg-destructive"}`} />
      {data.is_online ? "Online" : "Offline"}
      {data.current_players != null && ` (${data.current_players}/${data.max_players ?? "?"})`}
    </span>
  );
}

export default function AdminGameServers() {
  const { data: servers, isLoading } = useAdminGameServers();
  const createMut = useCreateServer();
  const updateMut = useUpdateServer();
  const deleteMut = useDeleteServer();

  const [addOpen, setAddOpen] = useState(false);
  const [editServer, setEditServer] = useState<GameServer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [promoServer, setPromoServer] = useState<GameServer | null>(null);

  const promoData = promoServer ? buildServerPromo(promoServer) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Game Servers</h1>
          <p className="text-muted-foreground text-sm">Manage dedicated gaming servers for your community.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Server</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Servers</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !servers?.length ? (
            <p className="text-muted-foreground text-center py-8">No servers yet. Add your first server above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.games?.name ?? s.game}</TableCell>
                    <TableCell>
                      <button
                        className="font-mono text-xs hover:text-primary transition-colors"
                        onClick={() => { navigator.clipboard.writeText(`${s.ip_address}${s.port ? `:${s.port}` : ""}`); toast({ title: "Copied!" }); }}
                      >
                        {s.ip_address}{s.port ? `:${s.port}` : ""} <Copy className="inline h-3 w-3 ml-1" />
                      </button>
                    </TableCell>
                    <TableCell><StatusCell server={s} /></TableCell>
                    <TableCell>
                      <Switch checked={s.is_active} onCheckedChange={c => updateMut.mutate({ id: s.id, is_active: c })} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => setPromoServer(s)} title="Generate Promo"><Megaphone className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditServer(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ServerFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initial={emptyForm}
        loading={createMut.isPending}
        onSubmit={v => createMut.mutate(v, { onSuccess: () => setAddOpen(false) })}
      />

      {editServer && (
        <ServerFormDialog
          open={!!editServer}
          onOpenChange={o => !o && setEditServer(null)}
          initial={editServer}
          loading={updateMut.isPending}
          onSubmit={v => updateMut.mutate({ id: editServer.id, ...v }, { onSuccess: () => setEditServer(null) })}
        />
      )}

      {promoData && (
        <EventPromoEditorDialog
          open={!!promoServer}
          onOpenChange={o => !o && setPromoServer(null)}
          imageUrl={promoData.imageUrl}
          initialTexts={promoData.texts}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => !o && setDeleteId(null)}
        title="Delete Server"
        description="This will permanently remove this server listing."
        onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) }); }}
      />
    </div>
  );
}
