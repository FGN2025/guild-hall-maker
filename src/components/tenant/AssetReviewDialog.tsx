import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface AssetReviewItem {
  id?: string;
  file_name?: string | null;
  label?: string | null;
  file_path?: string | null;
  url?: string | null;
  source_url?: string | null;
  campaign_id?: string | null;
  is_published?: boolean | null;
  agent_source?: string | null;
  notes?: string | null;
  contextTitle?: string | null;
}

const BUCKET = "tenant-marketing";

function pathFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  let p = url.slice(idx + marker.length);
  const q = p.indexOf("?");
  if (q !== -1) p = p.slice(0, q);
  try { return decodeURIComponent(p); } catch { return p; }
}

export function AssetReviewDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  asset: AssetReviewItem | null;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function resolve() {
      setDims(null);
      setResolvedUrl(null);
      if (!open || !asset) return;
      setLoading(true);
      const objectPath = asset.file_path ?? pathFromUrl(asset.url);
      if (objectPath) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(objectPath, 600);
        if (!cancel) {
          if (!error && data?.signedUrl) setResolvedUrl(data.signedUrl);
          else setResolvedUrl(asset.url ?? asset.source_url ?? null);
        }
      } else if (!cancel) {
        setResolvedUrl(asset.url ?? asset.source_url ?? null);
      }
      if (!cancel) setLoading(false);
    }
    resolve();
    return () => { cancel = true; };
  }, [open, asset]);

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="truncate">{asset.file_name ?? "Asset"}</span>
            {asset.label && <Badge variant="outline" className="text-xs">{asset.label}</Badge>}
            {asset.is_published != null && (
              <Badge variant={asset.is_published ? "default" : "secondary"} className="text-xs">
                {asset.is_published ? "published" : "draft"}
              </Badge>
            )}
            {asset.contextTitle && (
              <span className="text-xs font-normal text-muted-foreground">· {asset.contextTitle}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded border bg-muted/40 min-h-[240px] flex items-center justify-center overflow-auto">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          {!loading && resolvedUrl && (
            <img
              src={resolvedUrl}
              alt={asset.file_name ?? ""}
              className="max-h-[70vh] w-auto object-contain"
              onLoad={(e) => {
                const img = e.currentTarget;
                setDims({ w: img.naturalWidth, h: img.naturalHeight });
              }}
            />
          )}
          {!loading && !resolvedUrl && (
            <div className="text-sm text-muted-foreground py-8">No image available.</div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {dims && (
            <>
              <dt className="text-muted-foreground">Dimensions</dt>
              <dd>{dims.w} × {dims.h}px</dd>
            </>
          )}
          {asset.agent_source && (
            <>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{asset.agent_source}</dd>
            </>
          )}
          {asset.campaign_id && (
            <>
              <dt className="text-muted-foreground">Campaign</dt>
              <dd className="truncate font-mono">{asset.campaign_id}</dd>
            </>
          )}
          {asset.source_url && (
            <>
              <dt className="text-muted-foreground">Origin URL</dt>
              <dd className="truncate"><a href={asset.source_url} target="_blank" rel="noreferrer" className="underline">{asset.source_url}</a></dd>
            </>
          )}
          {asset.notes && (
            <>
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="whitespace-pre-wrap">{asset.notes}</dd>
            </>
          )}
        </dl>

        <div className="flex justify-end gap-2 pt-2">
          {asset.source_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(asset.source_url!);
                toast.success("Origin URL copied");
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Copy origin
            </Button>
          )}
          {resolvedUrl && (
            <Button size="sm" asChild>
              <a href={resolvedUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Open in new tab
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
