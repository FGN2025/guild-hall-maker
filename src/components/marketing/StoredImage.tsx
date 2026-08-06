import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Renders an image stored in a Supabase Storage bucket.
 *
 * A signed URL is a cache, never the source of truth: when a canonical object
 * `path` is known we mint a fresh signed URL for it, so a promo never renders
 * as a broken image just because the stored link aged out. `fallbackUrl` (the
 * cached `image_url` column) is used only until the fresh URL resolves, or when
 * no path is recorded.
 */
export function StoredImage({
  path,
  fallbackUrl,
  bucket = "tenant-marketing",
  alt = "",
  className,
}: {
  path?: string | null;
  fallbackUrl?: string | null;
  bucket?: string;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(fallbackUrl ?? null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setSrc(fallbackUrl ?? null);
      return;
    }
    (async () => {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
      if (!active) return;
      setSrc(data?.signedUrl ?? fallbackUrl ?? null);
    })();
    return () => {
      active = false;
    };
  }, [path, fallbackUrl, bucket]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
