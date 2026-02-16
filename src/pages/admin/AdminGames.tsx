import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGames, useCreateGame, useUpdateGame, useDeleteGame, useReorderGames, type Game, type GameInsert } from "@/hooks/useGames";
import AddGameDialog from "@/components/games/AddGameDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableGameRowProps {
  game: Game;
  onEdit: (game: Game) => void;
  onDelete: (id: string) => void;
}

const SortableGameRow = ({ game, onEdit, onDelete }: SortableGameRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: game.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-heading font-medium">{game.name}</TableCell>
      <TableCell><Badge variant="secondary" className="font-heading">{game.category}</Badge></TableCell>
      <TableCell className="text-muted-foreground text-xs">{game.slug}</TableCell>
      <TableCell>{game.is_active ? "✓" : "—"}</TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(game)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(game.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const AdminGames = () => {
  const { data: games, isLoading } = useAdminGames();
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const deleteGame = useDeleteGame();
  const reorderGames = useReorderGames();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);

  const sortedGames = useMemo(() => games ?? [], [games]);
  const gameIds = useMemo(() => sortedGames.map((g) => g.id), [sortedGames]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedGames.findIndex((g) => g.id === active.id);
    const newIndex = sortedGames.findIndex((g) => g.id === over.id);
    const reordered = arrayMove(sortedGames, oldIndex, newIndex);

    const updates = reordered.map((g, i) => ({ id: g.id, display_order: i }));
    reorderGames.mutate(updates);
  };

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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext items={gameIds} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {sortedGames.map((game) => (
                      <SortableGameRow
                        key={game.id}
                        game={game}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                    {sortedGames.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10 font-heading">
                          No games yet. Click "Add Game" to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </SortableContext>
              </Table>
            </DndContext>
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
