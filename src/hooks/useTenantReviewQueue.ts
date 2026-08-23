import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * The tenant portal's single source of truth for "how much work is waiting on
 * a reviewer right now".
 *
 * Deliberately NOT a notification feed. This project already accumulated 243
 * unread in-app notifications that nobody read; surfacing that pile again would
 * produce wallpaper, not a signal. Instead this reads live queue state — rows
 * that are still `pending_review` — and buckets scheduled posts by urgency, so
 * the bell can say "3 lapsed, 5 due in 48h" and link straight to the queue.
 * When the queue is empty the count is zero and the bell goes quiet by itself.
 */
export interface TenantReviewQueue {
  /** Everything awaiting a decision: posts + campaigns + campaign-linked assets. */
  total: number;
  posts: number;
  campaigns: number;
  assets: number;
  /** Posts whose scheduled slot has already passed. */
  lapsed: number;
  /** Posts scheduled inside the next 48 hours. */
  dueSoon: number;
  /** Nearest upcoming slot still ahead of now, ISO. */
  nextAt: string | null;
}

export const TENANT_REVIEW_QUEUE_KEY = "tenant_review_queue";

export function useTenantReviewQueue(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: [TENANT_REVIEW_QUEUE_KEY, tenantId],
    enabled: !!tenantId,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<TenantReviewQueue> => {
      const [postsRes, campaignsRes, assetsRes] = await Promise.all([
        supabase
          .from("scheduled_posts")
          .select("id, scheduled_at")
          .eq("tenant_id", tenantId!)
          .eq("status", "pending_review"),
        supabase
          .from("marketing_campaigns")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("status", "pending_review"),
        supabase
          .from("tenant_marketing_assets")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("is_published", false)
          .not("campaign_id", "is", null),
      ]);
      if (postsRes.error) throw postsRes.error;

      const now = Date.now();
      const rows = (postsRes.data ?? []) as { id: string; scheduled_at: string | null }[];
      let lapsed = 0;
      let dueSoon = 0;
      let nextAt: string | null = null;
      for (const r of rows) {
        if (!r.scheduled_at) continue;
        const t = new Date(r.scheduled_at).getTime();
        if (t < now) {
          lapsed += 1;
        } else {
          if (t < now + 48 * 3600_000) dueSoon += 1;
          if (!nextAt || t < new Date(nextAt).getTime()) nextAt = r.scheduled_at;
        }
      }

      const posts = rows.length;
      const campaigns = campaignsRes.count ?? 0;
      const assets = assetsRes.count ?? 0;
      return { total: posts + campaigns + assets, posts, campaigns, assets, lapsed, dueSoon, nextAt };
    },
  });
}
