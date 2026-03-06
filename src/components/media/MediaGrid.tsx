import { useState, useRef, useCallback } from "react";
import { MediaItem } from "@/hooks/useMediaLibrary";
import { Trash2, Copy, Image, Film, Music, ZoomIn, ZoomOut, RotateCcw, Move, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  media: MediaItem[];
  onDelete: (item: MediaItem) => void;
  isDeleting: boolean;
  onUpdateCategory?: (data: { itemId: string; category: string }) => void;
  onBulkDelete?: (items: MediaItem[]) => void;
  isBulkDeleting?: boolean;
}

const CATEGORIES = ["general", "games", "tournament", "badge", "trophy", "banner", "challenges", "marketing"];
const typeIcons: Record<string, typeof Image> = { image: Image, video: Film, audio: Music };

const MediaGrid = ({ media, onDelete, isDeleting, onUpdateCategory, onBulkDelete, isBulkDeleting }: Props) => {
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const openPreview = (item: MediaItem) => {
    resetView();
    setPreviewItem(item);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(media.map((m) => m.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    if (!onBulkDelete) return;
    const items = media.filter((m) => selectedIds.has(m.id));
    onBulkDelete(items);
    setSelectedIds(new Set());
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(0.25, z - e.deltaY * 0.002)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan((p) => ({
      x: p.x + e.clientX - lastMouse.current.x,
      y: p.y + e.clientY - lastMouse.current.y,
    }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  if (media.length === 0) {
    return (
      <div className="text-center py-16">
        <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-heading text-muted-foreground">No media found</p>
      </div>
    );
  }

  const selectionMode = selectedIds.size > 0;

  return (
    <>
    {selectionMode && onBulkDelete && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-4 rounded-xl border-2 border-primary bg-background/95 backdrop-blur-sm shadow-2xl">
        <span className="text-base font-heading font-bold text-foreground">{selectedIds.size} selected</span>
        <Button size="sm" variant="outline" onClick={selectedIds.size === media.length ? deselectAll : selectAll} className="font-heading">
          {selectedIds.size === media.length ? "Deselect All" : "Select All"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={isBulkDeleting} className="font-heading gap-1">
              {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Selected
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} items?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the selected media files. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button size="sm" variant="ghost" onClick={deselectAll} className="ml-auto font-heading text-muted-foreground">Cancel</Button>
      </div>
    )}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {media.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const Icon = typeIcons[item.file_type] ?? Image;
        return (
          <div key={item.id} className={`group rounded-xl border bg-card overflow-hidden glow-card ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}>
            <div
              className="aspect-square relative bg-muted flex items-center justify-center cursor-pointer"
              onClick={() => selectionMode ? toggleSelect(item.id) : (item.file_type === "image" && openPreview(item))}
            >
              <div
                className={`absolute top-2 left-2 z-10 transition-opacity ${selectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
              >
                <Checkbox checked={isSelected} className="h-5 w-5 bg-background/80 backdrop-blur-sm" />
              </div>
              {item.file_type === "image" ? (
                <img src={item.url} alt={item.file_name} className="w-full h-full object-cover" />
              ) : (
                <Icon className="h-10 w-10 text-muted-foreground" />
              )}
              {!selectionMode && <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:text-primary"
                  onClick={() => { navigator.clipboard.writeText(item.url); toast.success("URL copied"); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-foreground hover:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete media item?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{item.file_name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(item)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>}
            </div>
            <div className="p-2 space-y-1">
              <p className="text-xs font-heading text-foreground truncate">{item.file_name}</p>
              {onUpdateCategory ? (
                <Select
                  value={item.category}
                  onValueChange={(val) => onUpdateCategory({ itemId: item.id, category: val })}
                >
                  <SelectTrigger className="h-6 text-[10px] bg-transparent border-border/50 px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[10px] text-muted-foreground capitalize">{item.category}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>

    <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{previewItem?.file_name}</span>
            <div className="flex items-center gap-1 ml-4 shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(5, z + 0.25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={resetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        {previewItem && (
          <div
            className="relative overflow-hidden rounded-md bg-muted flex-1 min-h-0 select-none"
            style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={previewItem.url}
              alt={previewItem.file_name}
              className="w-full h-auto transition-transform duration-100"
              style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
              draggable={false}
            />
          </div>
        )}
        {zoom > 1 && (
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Move className="h-3 w-3" /> Click and drag to pan
          </p>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default MediaGrid;
