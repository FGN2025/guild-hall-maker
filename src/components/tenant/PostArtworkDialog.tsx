import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StoredImage } from "@/components/marketing/StoredImage";

/** Best-effort beat read from the composed object name (announce / day-of / ...). */
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
 * Mobile-first by requirement: reviewers are tenant admins approving from a
 * phone in portrait, one-handed. The sheet is full-bleed on small screens, the
 * close control is a thumb-sized target at the top, the beat/time context sits
 * above the image so it is read before scrolling, and the artwork fills the
 * viewport width so a 1080x1350 portrait promo is judged at usable size.
 *
 * Cost control: the image is only requested while open, and it is requested at
 * roughly the device's own pixel width (capped at native 1080) so we never
 * repeat the decode-budget failure that made the queue blank on iOS Safari.
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
  const [viewWidth, setViewWidth] = useState(1080);

  useEffect(() => {
    if (!open) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Cap at the composer's native width; asking for more only costs memory.
    setViewWidth(Math.min(1080, Math.round(window.innerWidth * dpr)));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="[&>button]:h-11 [&>button]:w-11 [&>button]:top-2 [&>button]:right-2 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button>svg]:h-5 [&>button>svg]:w-5 p-0 gap-0 w-screen max-w-none h-[100dvh] rounded-none sm:w-auto sm:max-w-3xl sm:h-auto sm:max-h-[92vh] sm:rounded-lg flex flex-col"
      >
        <DialogHeader className="p-3 pb-2 border-b space-y-2 shrink-0">
          <DialogTitle className="text-sm font-heading text-left leading-tight pr-12">
            {title ?? "Post artwork"}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {beat && <Badge variant="outline" className="capitalize">Beat: {beat}</Badge>}
            <Badge variant="outline">
              {scheduledAt ? new Date(scheduledAt).toLocaleString() : "No scheduled time"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Scroll/zoom surface: the image fills the viewport width in portrait so
            typography and palette are judgeable without pinching. */}
        <div className="flex-1 overflow-auto overscroll-contain bg-muted/30">
          {open && (
            <StoredImage
              path={path}
              fallbackUrl={fallbackUrl}
              transformWidth={viewWidth}
              quality={85}
              alt={`${title ?? "Post"} artwork, full size`}
              className="w-full h-auto sm:max-h-[70vh] sm:w-auto sm:mx-auto object-contain"
              eager
            />
          )}
          {caption && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3">{caption}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
