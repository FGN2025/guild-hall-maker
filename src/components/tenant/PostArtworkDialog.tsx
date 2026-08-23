import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StoredImage } from "@/components/marketing/StoredImage";

/** Best-effort beat read from the composed object name (announce / dayof / ...). */
export function beatFromPath(path?: string | null, fileName?: string | null): string | null {
  const hay = `${path ?? ""} ${fileName ?? ""}`.toLowerCase();
  const beats = ["announce", "dayof", "day-of", "reminder", "recap", "results", "lastcall", "last-call"];
  const hit = beats.find((b) => hay.includes(b));
  if (!hit) return null;
  return hit.replace(/-/g, "").replace("dayof", "day of").replace("lastcall", "last call");
}

/**
 * Full-resolution artwork viewer for the review queue.
 *
 * The native-resolution image is only requested while the dialog is open, so
 * opening one post never costs the other fifteen anything.
 */
export default function PostArtworkDialog({
  open,
  onOpenChange,
  path,
  fallbackUrl,
  title,
  beat,
  scheduledAt,
  caption,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  path?: string | null;
  fallbackUrl?: string | null;
  title?: string | null;
  beat?: string | null;
  scheduledAt?: string | null;
  caption?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">{title ?? "Post artwork"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {beat && <Badge variant="outline" className="capitalize">Beat: {beat}</Badge>}
          <Badge variant="outline">
            {scheduledAt ? `Scheduled ${new Date(scheduledAt).toLocaleString()}` : "No scheduled time"}
          </Badge>
        </div>
        {open && (
          <div className="flex justify-center bg-muted/30 rounded p-2">
            <StoredImage
              path={path}
              fallbackUrl={fallbackUrl}
              alt={`${title ?? "Post"} artwork at full resolution`}
              className="max-h-[70vh] w-auto rounded object-contain"
              eager
            />
          </div>
        )}
        {caption && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded bg-muted p-2">{caption}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
