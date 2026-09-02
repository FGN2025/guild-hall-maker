import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EVIDENCE_BUCKET, isEvidencePath, evidencePath } from "@/lib/evidenceUrl";

interface EvidenceLike {
  id: string;
  file_url: string | null;
}

/**
 * Resolves evidence file_url values to displayable URLs.
 * `evidence:<path>` values become short-lived signed URLs from the private
 * evidence bucket; all other values (legacy public URLs, video links) pass
 * through unchanged.
 */
export function useSignedEvidenceUrls<T extends EvidenceLike>(items: T[]) {
  const paths = items
    .filter((i) => isEvidencePath(i.file_url))
    .map((i) => evidencePath(i.file_url!));
  const key = paths.slice().sort().join(",");

  const { data } = useQuery({
    queryKey: ["evidence-signed-urls", key],
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000, // signed URLs last 60 min
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrls(paths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((d) => {
        if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
      });
      return map;
    },
  });

  return (item: T): string | null => {
    if (!item.file_url) return null;
    if (!isEvidencePath(item.file_url)) return item.file_url;
    return data?.[evidencePath(item.file_url)] ?? null;
  };
}
