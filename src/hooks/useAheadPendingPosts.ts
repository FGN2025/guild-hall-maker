import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Ahead-only" review set.
 *
 * The cutoff is evaluated by Postgres, not the browser: the filter value is the
 * literal `now`, which PostgREST casts to `timestamptz` server side. A reviewer
 * in another timezone (or with a skewed clock) therefore gets the SAME set.
 *
 * The returned `serverNow` is read from the API response `Date` header purely so
 * the confirm dialog can show the cutoff that was actually applied — it is never
 * used to filter.
 */
export interface AheadPendingResult {
  ids: string[];
  serverNow: string | null;
}

const REST_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`;

async function readServerNow(): Promise<string | null> {
  try {
    const res = await fetch(REST_URL, {
      method: "HEAD",
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
    });
    return res.headers.get("date");
  } catch {
    return null;
  }
}

export async function fetchAheadPendingPosts(tenantId: string): Promise<AheadPendingResult> {
  const { data, error } = await supabase
    .from("scheduled_posts" as any)
    .select("id, scheduled_at")
    .eq("tenant_id", tenantId)
    // status guard and time guard are both server side; a passed post or a post
    // in any other status can never enter this set.
    .eq("status", "pending_review")
    .gt("scheduled_at", "now")
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  const serverNow = await readServerNow();
  return { ids: ((data ?? []) as any[]).map((r) => r.id as string), serverNow };
}

/** Live count for the button label. Cheap: ids only. */
export function useAheadPendingPosts(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["ahead_pending_posts", tenantId],
    enabled: !!tenantId,
    queryFn: () => fetchAheadPendingPosts(tenantId!),
    staleTime: 30_000,
  });
}
