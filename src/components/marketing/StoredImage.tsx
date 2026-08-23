import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageOff } from "lucide-react";

/**
 * Renders an image stored in a Supabase Storage bucket.
 *
 * A signed URL is a cache, never the source of truth: when a canonical object
 * `path` is known we mint a fresh signed URL for it, so a promo never renders
 * as a broken image just because the stored link aged out. `fallbackUrl` (the
 * cached `image_url` column) is used only until the fresh URL resolves, or when
 * no path is recorded.
 *
 * `transformWidth` requests a server-side resize so a review thumbnail costs
 * ~20 KB instead of decoding a 1080x1350 PNG. If the storage tier refuses the
 * transform we silently fall back to the full-size signed URL.
 *
 * Failures are never silent: a broken or missing image renders a visible
 * placeholder a reviewer can see and report.
 */
export function StoredImage({
  path,
  fallbackUrl,
  bucket = "tenant-marketing",
  alt = "",
  className,
  transformWidth,
  quality = 70,
  eager = false,
}: {
  path?: string | null;
  fallbackUrl?: string | null;
  bucket?: string;
  alt?: string;
  className?: string;
  /** Request a resized render (px). Omit for native resolution. */
  transformWidth?: number;
  quality?: number;
  eager?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    if (!path) {
      setSrc(fallbackUrl ?? null);
      return;
    }
    (async () => {
      if (transformWidth) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60, { transform: { width: transformWidth, resize: "contain", quality } });
        if (!active) return;
        if (!error && data?.signedUrl) {
          setSrc(data.signedUrl);
          return;
        }
      }
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
      if (!active) return;
      setSrc(data?.signedUrl ?? fallbackUrl ?? null);
    })();
    return () => {
      active = false;
    };
  }, [path, fallbackUrl, bucket, transformWidth, quality]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={failed ? `${alt || "Image"} failed to load` : `${alt || "Image"} loading`}
        className={`flex flex-col items-center justify-center gap-1 rounded bg-muted text-muted-foreground text-[10px] text-center p-1 ${className ?? ""}`}
      >
        <ImageOff className="h-4 w-4" />
        {failed ? "Image failed to load" : "Loading…"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
