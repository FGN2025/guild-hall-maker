import { useState, useMemo } from "react";
import usePageTitle from "@/hooks/usePageTitle";

import {
  useAdminGames, useCreateGame, useUpdateGame, useDeleteGame,
  useBulkDeleteGames, useReorderGames, type Game, type GameInsert,
} from "@/hooks/useGames";
import AddGameDialog from "@/components/games/AddGameDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Loader2, GripVertical,
  LayoutList, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ──────────────────────────────────────────────
type SortField = "name" | "category" | "slug" | "is_active" | null;
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";

// ── Sortable table row ─────────────────────────────────
interface SortableGameRowProps {
  game: Game;
  selected: boolean;
  onSelect: (id: string, v: boolean) => void;
  onEdit: (game: Game) => void;
  onDelete: (id: string) => void;
  onToggleActive: (game: Game) => void;
  dragEnabled: boolean;
}

const SortableGameRow = ({
  game, selected, onSelect, onEdit, onDelete, onToggleActive, dragEnabled,
}: SortableGameRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: game.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} data-state={selected ? "selected" : undefined}>
      <TableCell className="w-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(game.id, !!v)}
          aria-label={`Select ${game.name}`}
        />
      </TableCell>
      {dragEnabled && (
        <TableCell className="w-10">
          <button
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </TableCell>
      )}
      <TableCell className="font-heading font-medium">{game.name}</TableCell>
      <TableCell><Badge variant="secondary" className="font-heading">{game.category}</Badge></TableCell>
      <TableCell className="text-muted-foreground text-xs">{game.slug}</TableCell>
      <TableCell>
        <Switch
          checked={game.is_active}
          onCheckedChange={() => onToggleActive(game)}
          aria-label={`Toggle ${game.name} active`}
        />
      </TableCell>
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

// ── Grid card ──────────────────────────────────────────
interface GameGridCardProps {
  game: Game;
  selected: boolean;
  onSelect: (id: string, v: boolean) => void;
  onEdit: (game: Game) => void;
  onDelete: (id: string) => void;
  onToggleActive: (game: Game) => void;
}

const GameGridCard = ({ game, selected, onSelect, onEdit, onDelete, onToggleActive }: GameGridCardProps) => (
  <Card className={`group relative overflow-hidden transition-shadow hover:shadow-lg ${selected ? "ring-2 ring-primary" : ""}`}>
    <div className="aspect-[3/4] bg-muted relative">
      {game.cover_image_url ? (
        <img src={game.cover_image_url} alt={game.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No cover</div>
      )}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(game.id, !!v)}
          aria-label={`Select ${game.name}`}
          className="bg-background/80 backdrop-blur-sm"
        />
      </div>
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => onEdit(game)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => onDelete(game.id)}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
      {!game.is_active && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
          <Badge variant="outline" className="bg-background/90">Inactive</Badge>
        </div>
      )}
    </div>
    <CardContent className="p-3 space-y-1.5">
      <p className="font-heading font-medium text-sm truncate">{game.name}</p>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-heading">{game.category}</Badge>
        <Switch
          checked={game.is_active}
          onCheckedChange={() => onToggleActive(game)}
          aria-label={`Toggle ${game.name} active`}
          className="scale-75 origin-right"
        />
      </div>
    </CardContent>
  </Card>
);

// ── Sortable header helper ─────────────────────────────
const SortableHeader = ({
  label, field, sortField, sortDir, onSort,
}: { label: string; field: SortField; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void }) => {
  const Icon = sortField === field ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
};

// ── Main page ──────────────────────────────────────────
const AdminGames = () => {
  const { data: games, isLoading } = useAdminGames();
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const deleteGame = useDeleteGame();
  const bulkDeleteGames = useBulkDeleteGames();
  const reorderGames = useReorderGames();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const dragEnabled = sortField === null;

  // Sorting
  const sortedGames = useMemo(() => {
    const list = [...(games ?? [])];
    if (!sortField) return list;
    return list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "is_active") {
        cmp = Number(a.is_active) - Number(b.is_active);
      } else {
        cmp = (a[sortField] ?? "").localeCompare(b[sortField] ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [games, sortField, sortDir]);

  const gameIds = useMemo(() => sortedGames.map((g) => g.id), [sortedGames]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Selection
  const allSelected = sortedGames.length > 0 && sortedGames.every((g) => selectedIds.has(g.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string, v: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      v ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleAll = (v: boolean) => {
    setSelectedIds(v ? new Set(gameIds) : new Set());
  };

  // DnD
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
    reorderGames.mutate(reordered.map((g, i) => ({ id: g.id, display_order: i })));
  };

  // CRUD handlers
  const handleSubmit = async (payload: any) => {
    if (payload.id) await updateGame.mutateAsync(payload);
    else await createGame.mutateAsync(payload as GameInsert);
    setDialogOpen(false);
    setEditGame(null);
  };

  const handleEdit = (game: Game) => { setEditGame(game); setDialogOpen(true); };

  const handleDeleteSingle = (id: string) => setSingleDeleteId(id);

  const confirmDeleteSingle = async () => {
    if (singleDeleteId) {
      await deleteGame.mutateAsync(singleDeleteId);
      selectedIds.delete(singleDeleteId);
      setSelectedIds(new Set(selectedIds));
    }
    setSingleDeleteId(null);
  };

  const confirmBulkDelete = async () => {
    await bulkDeleteGames.mutateAsync([...selectedIds]);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="font-display text-2xl font-bold tracking-wider">Games</h1>
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => { setEditGame(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Game
            </Button>
          </div>
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="flex items-center gap-3 bg-muted/60 border border-border rounded-lg px-4 py-2">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              className="gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : viewMode === "list" ? (
          /* ── List view ── */
          <div className="border border-border rounded-lg overflow-hidden">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => toggleAll(!!v)}
                        aria-label="Select all"
                      />
                    </TableHead>
                    {dragEnabled && <TableHead className="w-10" />}
                    <TableHead><SortableHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead><SortableHeader label="Category" field="category" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead><SortableHeader label="Slug" field="slug" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead><SortableHeader label="Active" field="is_active" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext items={gameIds} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {sortedGames.map((game) => (
                      <SortableGameRow
                        key={game.id}
                        game={game}
                        selected={selectedIds.has(game.id)}
                        onSelect={toggleSelect}
                        onEdit={handleEdit}
                        onDelete={handleDeleteSingle}
                        onToggleActive={(g) => updateGame.mutate({ id: g.id, is_active: !g.is_active })}
                        dragEnabled={dragEnabled}
                      />
                    ))}
                    {sortedGames.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={dragEnabled ? 7 : 6} className="text-center text-muted-foreground py-10 font-heading">
                          No games yet. Click "Add Game" to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </SortableContext>
              </Table>
            </DndContext>
          </div>
        ) : (
          /* ── Grid view ── */
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => toggleAll(!!v)}
                aria-label="Select all"
              />
              <span className="text-sm text-muted-foreground">Select all</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortedGames.map((game) => (
                <GameGridCard
                  key={game.id}
                  game={game}
                  selected={selectedIds.has(game.id)}
                  onSelect={toggleSelect}
                  onEdit={handleEdit}
                  onDelete={handleDeleteSingle}
                  onToggleActive={(g) => updateGame.mutate({ id: g.id, is_active: !g.is_active })}
                />
              ))}
            </div>
            {sortedGames.length === 0 && (
              <p className="text-center text-muted-foreground py-10 font-heading">
                No games yet. Click "Add Game" to get started.
              </p>
            )}
          </div>
        )}
      </div>

      <AddGameDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditGame(null); }}
        onSubmit={handleSubmit}
        loading={createGame.isPending || updateGame.isPending}
        editGame={editGame}
      />

      {/* Single delete confirm */}
      <AlertDialog open={!!singleDeleteId} onOpenChange={(v) => !v && setSingleDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete game?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSingle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} game(s)?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove all selected games. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteGames.isPending}
            >
              {bulkDeleteGames.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminGames;
