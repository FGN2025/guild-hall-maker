import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Passive pending-review surface for the admin console.
 * Agent-authored marketing work can only ever land in `pending_review`, and
 * nothing publishes until a human approves it. Before this card there was no
 * surface in /admin at all that revealed a review backlog existed.
 */
const PendingReviewCard = () => {
  const { data } = useQuery({
    queryKey: ["admin-pending-review-count"],
    refetchInterval: 120_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const countPending = (table: "scheduled_posts" | "marketing_campaigns" | "marketing_assets") =>
        (supabase.from(table) as any)
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_review");

      const [posts, campaigns, assets, lapsed] = await Promise.all([
        countPending("scheduled_posts"),
        countPending("marketing_campaigns"),
        countPending("marketing_assets"),
        countPending("scheduled_posts").lt("scheduled_at", nowIso),
      ]);
      return {
        total: (posts.count ?? 0) + (campaigns.count ?? 0) + (assets.count ?? 0),
        posts: posts.count ?? 0,
        lapsed: lapsed.count ?? 0,
      };
    },
  });

  const total = data?.total ?? 0;
  const lapsed = data?.lapsed ?? 0;

  return (
    <Link to="/admin/marketing">
      <Card className={total > 0 ? "border-primary/60 hover:border-primary transition-colors" : "hover:border-primary/50 transition-colors"}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading text-muted-foreground">Awaiting Review</CardTitle>
          <ClipboardCheck className={`h-5 w-5 ${total > 0 ? "text-primary" : "text-muted-foreground"}`} />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-display font-bold">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data?.posts ?? 0} scheduled post{(data?.posts ?? 0) === 1 ? "" : "s"}
            {lapsed > 0 ? ` · ${lapsed} past window` : ""}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PendingReviewCard;
