import { Badge } from "@/components/ui/badge";

/** Review-state vocabulary shared by the tenant Campaigns tab and detail page.
 *  `is_published` wins over `status` because a published row is terminal. */
export type CampaignStatusKey = "pending_review" | "approved" | "published" | "rejected" | "draft";

export function resolveCampaignStatus(c: { status?: string | null; is_published?: boolean | null }): CampaignStatusKey {
  if (c.is_published) return "published";
  const s = (c.status ?? "draft") as CampaignStatusKey;
  return (["pending_review", "approved", "published", "rejected", "draft"] as const).includes(s) ? s : "draft";
}

const LABELS: Record<CampaignStatusKey, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  draft: "Draft",
};

const CLASSES: Record<CampaignStatusKey, string> = {
  pending_review: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  approved: "bg-cyan-500/15 text-cyan-400 border-cyan-500/40",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/40",
  draft: "bg-muted text-muted-foreground border-border",
};

/** Sort weight — pending review surfaces first in the library grid. */
export const STATUS_ORDER: Record<CampaignStatusKey, number> = {
  pending_review: 0,
  rejected: 1,
  approved: 2,
  draft: 3,
  published: 4,
};

export const CAMPAIGN_STATUS_LABELS = LABELS;

const CampaignStatusBadge = ({ status }: { status: CampaignStatusKey }) => (
  <Badge variant="outline" className={`text-[10px] shrink-0 ${CLASSES[status]}`}>
    {LABELS[status]}
  </Badge>
);

export default CampaignStatusBadge;
