import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useGames, useCreateGame, useUpdateGame, useDeleteGame, type Game, type GameInsert } from "@/hooks/useGames";
import AddGameDialog from "@/components/games/AddGameDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const AdminGames = () => {
  const { data: games, isLoading } = useGames();
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const deleteGame = useDeleteGame();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);

  const handleSubmit = async (payload: any) => {
    if (payload.id) {
      await updateGame.mutateAsync(payload);
    } else {
      await createGame.mutateAsync(payload as GameInsert);
    }
    setDialogOpen(false);
    setEditGame(null);
  };

  const handleEdit = (game: Game) => {
    setEditGame(game);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this game?")) {
      await deleteGame.mutateAsync(id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-wider">Games</h1>
          <Button onClick={() => { setEditGame(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Game
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(games ?? []).map(game => (
                  <TableRow key={game.id}>
                    <TableCell className="font-heading font-medium">{game.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-heading">{game.category}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{game.slug}</TableCell>
                    <TableCell>{game.is_active ? "✓" : "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(game)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(game.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(games ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10 font-heading">
                      No games yet. Click "Add Game" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <AddGameDialog
          open={dialogOpen}
          onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditGame(null); }}
          onSubmit={handleSubmit}
          loading={createGame.isPending || updateGame.isPending}
          editGame={editGame}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminGames;
