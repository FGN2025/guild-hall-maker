import { MediaItem } from "@/hooks/useMediaLibrary";
import { Trash2, Copy, Image, Film, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  media: MediaItem[];
  onDelete: (item: MediaItem) => void;
  isDeleting: boolean;
  onUpdateCategory?: (data: { itemId: string; category: string }) => void;
}

const CATEGORIES = ["general", "games", "tournament", "badge", "trophy", "banner", "challenges", "marketing"];
const typeIcons: Record<string, typeof Image> = { image: Image, video: Film, audio: Music };

const MediaGrid = ({ media, onDelete, isDeleting, onUpdateCategory }: Props) => {
  if (media.length === 0) {
    return (
      <div className="text-center py-16">
        <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-heading text-muted-foreground">No media found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {media.map((item) => {
        const Icon = typeIcons[item.file_type] ?? Image;
        return (
          <div key={item.id} className="group rounded-xl border border-border bg-card overflow-hidden glow-card">
            <div className="aspect-square relative bg-muted flex items-center justify-center">
              {item.file_type === "image" ? (
                <img src={item.url} alt={item.file_name} className="w-full h-full object-cover" />
              ) : (
                <Icon className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
              </div>
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
  );
};

export default MediaGrid;
