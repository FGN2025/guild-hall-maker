import { useState } from "react";
import { useCloudGames, type CloudGame } from "@/hooks/useCloudGames";
import CloudGameFormDialog from "@/components/admin/CloudGameFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Cloud } from "lucide-react";

const AdminCloudGaming = () => {
  const { games, isLoading, createGame, updateGame, deleteGame } = useCloudGames();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<CloudGame | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CloudGame | null>(null);
  const [search, setSearch] = useState("");

  const filtered = games.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      (g.genre || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    setEditingGame(null);
    setDialogOpen(true);
  };

  const handleEdit = (game: CloudGame) => {
    setEditingGame(game);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Cloud className="h-6 w-6" /> Cloud Gaming Catalog
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the Blacknut cloud game catalog available to tenants and their subscribers.
            </p>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Game
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Blacknut ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {search ? "No games match your search." : "No cloud games yet. Add one to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {game.cover_url ? (
                            <img src={game.cover_url} alt={game.title} className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Cloud className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{game.title}</p>
                            {game.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{game.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{game.genre || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{game.blacknut_game_id}</TableCell>
                      <TableCell>
                        <Badge variant={game.is_active ? "default" : "secondary"}>
                          {game.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(game)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(game)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CloudGameFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        game={editingGame}
        isPending={createGame.isPending || updateGame.isPending}
        onSubmit={(data) => {
          if (editingGame) {
            updateGame.mutate({ id: editingGame.id, ...data }, { onSuccess: () => setDialogOpen(false) });
          } else {
            createGame.mutate(data, { onSuccess: () => setDialogOpen(false) });
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Cloud Game"
        description={`Remove "${deleteTarget?.title}" from the catalog? This cannot be undone.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteGame.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
          }
        }}
        variant="destructive"
      />
    </>
  );
};

export default AdminCloudGaming;
