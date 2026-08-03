import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { Bot, Check, X, Loader2, MessageSquare, Image as ImageIcon, CalendarClock, Eye, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AssetReviewDialog, type AssetReviewItem } from "./AssetReviewDialog";
import { useDraftDecision } from "@/hooks/useDraftDecision";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Kind = "campaign" | "scheduled_post" | "asset";

interface DraftRow {
  id: string;
  kind: Kind;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  social_copy?: string | null;
  platform?: string | null;
  image_url?: string | null;
  url?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  label?: string | null;
  campaign_id?: string | null;
  source_url?: string | null;
  source_event_id?: string | null;
  source_tournament_id?: string | null;
  scheduled_at?: string | null;
  is_published?: boolean | null;
  notes?: string | null;
  status: string;
  feedback_note?: string | null;
  agent_source?: string | null;
  created_at: string;
  updated_at: string;
}

interface LinkedAsset {
  id: string;
  campaign_id: string | null;
  file_name: string | null;
  file_path: string | null;
  url: string | null;
  source_url: string | null;
  label: string | null;
  is_published: boolean | null;
  agent_source: string | null;
  notes: string | null;
}

export default function AgentDraftsPanel({ tenantId }: { tenantId: string | null | undefined }) {
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAsset, setReviewAsset] = useState<AssetReviewItem | null>(null);
  const decide = useDraftDecision(tenantId);
  const { tenantInfo } = useTenantAdmin();
  const { isAdmin } = useAuth();
  /** Only tenant Admins/Managers (or platform admins) can approve or reject. */
  const canDecide = isAdmin || tenantInfo?.tenantRole === "admin" || tenantInfo?.tenantRole === "manager";


  const { data, isLoading } = useQuery({
    queryKey: ["agent_drafts", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<DraftRow[]> => {
      const thirtyDays = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [campaigns, posts, assets] = await Promise.all([
        supabase
          .from("marketing_campaigns" as any)
          .select("id, title, description, social_copy, status, feedback_note, source_event_id, source_tournament_id, agent_source, created_at, updated_at")
          .eq("tenant_id", tenantId!)
          .or(`status.eq.pending_review,and(status.eq.rejected,updated_at.gte.${thirtyDays})`)
          .order("updated_at", { ascending: false }),
        supabase
          .from("scheduled_posts" as any)
          .select("id, campaign_id, platform, caption, image_url, scheduled_at, status, feedback_note, agent_source, created_at, updated_at, conflict_flagged_at, conflict_details, undeliverable_reason")
          .eq("tenant_id", tenantId!)
          .or(`status.eq.pending_review,and(status.eq.rejected,updated_at.gte.${thirtyDays})`)
          .order("updated_at", { ascending: false }),
        supabase
          .from("tenant_marketing_assets" as any)
          .select("id, campaign_id, file_name, file_path, url, source_url, label, is_published, agent_source, notes, feedback_note, created_at, updated_at")
          .eq("tenant_id", tenantId!)
          .eq("is_published", false)
          // Review covers agent output plus campaign-linked promos (Quick Promo);
          // loose manual uploads stay out of the queue.
          .or("agent_source.not.is.null,campaign_id.not.is.null")
          .order("updated_at", { ascending: false }),

      ]);
      const rows: DraftRow[] = [
        ...((campaigns.data ?? []) as any[]).map((r) => ({ ...r, kind: "campaign" as const })),
        ...((posts.data ?? []) as any[]).map((r) => ({ ...r, kind: "scheduled_post" as const })),
        ...((assets.data ?? []) as any[]).map((r) => ({ ...r, kind: "asset" as const, status: "pending_review" })),
      ];
      return rows;
    },
  });

  const rows = data ?? [];

  // ---- Week grouping ------------------------------------------------------
  // Scheduled posts group by the week they go out; campaigns and assets group
  // by the week they were last touched.
  const referenceDate = (r: DraftRow) =>
    new Date(r.kind === "scheduled_post" && r.scheduled_at ? r.scheduled_at : r.updated_at);

  const startOfWeek = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay()); // Sunday start
    return x;
  };

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; start: Date; rows: DraftRow[] }>();
    for (const r of rows) {
      const start = startOfWeek(referenceDate(r));
      const key = start.toISOString().slice(0, 10);
      const g = map.get(key) ?? { key, start, rows: [] };
      g.rows.push(r);
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [rows]);

  const weekLabel = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `Week of ${fmt(start)} – ${fmt(end)}`;
  };

  const [bulkBusyKey, setBulkBusyKey] = useState<string | null>(null);

  const bulkApprove = async (key: string, targets: DraftRow[]) => {
    setBulkBusyKey(key);
    let ok = 0;
    const failures: string[] = [];
    for (const row of targets) {
      try {
        await decide.mutateAsync({ row, approve: true, note: feedbackById[row.id] });
        ok += 1;
      } catch (e: any) {
        failures.push(e?.message ?? "unknown error");
      }
    }
    setBulkBusyKey(null);
    if (failures.length) {
      toast.error(`Approved ${ok} of ${targets.length}. ${failures.length} failed: ${failures[0]}`);
    } else {
      toast.success(`Approved ${ok} draft${ok === 1 ? "" : "s"}`);
    }
  };


  const campaignIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.kind === "campaign") ids.add(r.id);
      if (r.kind === "scheduled_post" && r.campaign_id) ids.add(r.campaign_id);
    }
    return Array.from(ids);
  }, [rows]);

  const eventIds = useMemo(
    () => Array.from(new Set(rows.filter((r) => r.kind === "campaign" && r.source_event_id).map((r) => r.source_event_id!))),
    [rows],
  );
  const tournamentIds = useMemo(
    () => Array.from(new Set(rows.filter((r) => r.kind === "campaign" && r.source_tournament_id).map((r) => r.source_tournament_id!))),
    [rows],
  );

  const { data: linkedAssets } = useQuery({
    queryKey: ["agent_drafts_linked_assets", tenantId, campaignIds.join(",")],
    enabled: !!tenantId && campaignIds.length > 0,
    queryFn: async (): Promise<LinkedAsset[]> => {
      const { data, error } = await supabase
        .from("tenant_marketing_assets" as any)
        .select("id, campaign_id, file_name, file_path, url, source_url, label, is_published, agent_source, notes")
        .eq("tenant_id", tenantId!)
        .in("campaign_id", campaignIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: eventLookup } = useQuery({
    queryKey: ["agent_drafts_events", eventIds.join(",")],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("tenant_events" as any).select("id, name").in("id", eventIds);
      return Object.fromEntries((data ?? []).map((r: any) => [r.id, r.name])) as Record<string, string>;
    },
  });
  const { data: tournamentLookup } = useQuery({
    queryKey: ["agent_drafts_tournaments", tournamentIds.join(",")],
    enabled: tournamentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("tournaments" as any).select("id, name").in("id", tournamentIds);
      return Object.fromEntries((data ?? []).map((r: any) => [r.id, r.name])) as Record<string, string>;
    },
  });

  const assetsByCampaign = useMemo(() => {
    const map = new Map<string, LinkedAsset[]>();
    for (const a of linkedAssets ?? []) {
      if (!a.campaign_id) continue;
      const list = map.get(a.campaign_id) ?? [];
      list.push(a);
      map.set(a.campaign_id, list);
    }
    return map;
  }, [linkedAssets]);

  function openReview(a: AssetReviewItem) {
    setReviewAsset(a);
    setReviewOpen(true);
  }

  const onDecide = (row: DraftRow, approve: boolean) =>
    decide.mutate({ row, approve, note: feedbackById[row.id] });


  if (!tenantId) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Join a tenant to see agent drafts.</CardContent></Card>;
  }
  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  const pending = rows.filter((r) => r.status === "pending_review");
  const rejected = rows.filter((r) => r.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-heading">Review queue</h2>
        <Badge variant="secondary">{pending.length} pending</Badge>
        {rejected.length > 0 && <Badge variant="outline">{rejected.length} rejected (30d)</Badge>}
        {canDecide && pending.length > 0 && (
          <Button
            size="sm"
            className="ml-auto"
            disabled={!!bulkBusyKey}
            onClick={() => bulkApprove("__all__", pending)}
          >
            {bulkBusyKey === "__all__" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Approve all {pending.length} pending
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {canDecide
          ? "Nothing here publishes automatically. Approve to make a draft live; reject with a note so the creator (or agent) can revise it."
          : "Your drafts stay private until a tenant Admin or Manager approves them. Rejection notes appear here."}

      </p>

      {rows.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No agent drafts yet.</CardContent></Card>
      )}

      {groups.map((group) => {
        const groupPending = group.rows.filter((r) => r.status === "pending_review");
        return (
        <section key={group.key} className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <h3 className="text-sm font-heading uppercase tracking-wide text-muted-foreground">
              {weekLabel(group.start)}
            </h3>
            <Badge variant="outline" className="text-xs">{group.rows.length}</Badge>
            {groupPending.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                disabled={!!bulkBusyKey}
                onClick={() => bulkApprove(group.key, groupPending)}
              >
                {bulkBusyKey === group.key ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Approve week ({groupPending.length})
              </Button>
            )}
          </div>
          <div className="grid gap-4">
          {group.rows.map((row) => {
          const linked =
            row.kind === "campaign" ? assetsByCampaign.get(row.id) ?? [] :
            row.kind === "scheduled_post" && row.campaign_id ? assetsByCampaign.get(row.campaign_id) ?? [] :
            [];
          const eventName = row.source_event_id ? eventLookup?.[row.source_event_id] : undefined;
          const tournamentName = row.source_tournament_id ? tournamentLookup?.[row.source_tournament_id] : undefined;
          const linkedLabel = eventName ?? tournamentName;

          return (
            <Card key={`${row.kind}-${row.id}`} className={row.status === "rejected" ? "border-destructive/40" : "border-primary/30"}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {row.kind === "campaign" && <MessageSquare className="h-4 w-4 text-primary shrink-0" />}
                    {row.kind === "scheduled_post" && <CalendarClock className="h-4 w-4 text-primary shrink-0" />}
                    {row.kind === "asset" && <ImageIcon className="h-4 w-4 text-primary shrink-0" />}
                    <CardTitle className="text-base font-heading truncate">
                      {row.kind === "campaign" && (row.title ?? "Untitled campaign")}
                      {row.kind === "scheduled_post" && `${row.platform ?? "post"} · ${row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : "no time"}`}
                      {row.kind === "asset" && (row.file_name ?? "Untitled asset")}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="capitalize text-xs">{row.kind.replace("_", " ")}</Badge>
                    <Badge variant={row.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {row.status.replace("_", " ")}
                    </Badge>
                    {(row as any).conflict_flagged_at && (
                      <Badge variant="destructive" className="text-xs">Schedule conflict</Badge>
                    )}
                    {(row as any).undeliverable_reason && (
                      <Badge variant="destructive" className="text-xs">Undeliverable</Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>Updated {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })} · {row.agent_source ?? "agent"}</span>
                  {linkedLabel && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Link2 className="h-3 w-3" /> Linked to: {linkedLabel}
                    </Badge>
                  )}
                  {row.kind === "campaign" && !linkedLabel && (
                    <Badge variant="outline" className="text-xs">Standalone (no linked event)</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {row.kind === "campaign" && (
                  <div className="space-y-1 text-sm">
                    {row.description && <p className="text-muted-foreground whitespace-pre-wrap">{row.description}</p>}
                    {row.social_copy && (
                      <div className="rounded bg-muted p-2 whitespace-pre-wrap text-sm">{row.social_copy}</div>
                    )}
                  </div>
                )}
                {row.kind === "scheduled_post" && (
                  <div className="flex gap-3">
                    {row.image_url && <img src={row.image_url} alt="" className="h-24 w-24 rounded object-cover bg-muted shrink-0" loading="lazy" />}
                    {row.caption && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{row.caption}</p>}
                  </div>
                )}
                {row.kind === "asset" && row.url && (
                  <img src={row.url} alt={row.file_name ?? ""} className="max-h-40 rounded object-contain bg-muted" loading="lazy" />
                )}

                {(row.kind === "asset" || linked.length > 0 || (row.kind === "scheduled_post" && row.image_url)) && (
                  <div className="flex flex-wrap gap-2">
                    {row.kind === "asset" && (
                      <Button variant="outline" size="sm" onClick={() => openReview({
                        id: row.id,
                        file_name: row.file_name,
                        label: row.label,
                        file_path: row.file_path,
                        url: row.url,
                        source_url: row.source_url,
                        campaign_id: row.campaign_id,
                        is_published: row.is_published,
                        agent_source: row.agent_source,
                        notes: row.notes,
                      })}>
                        <Eye className="h-4 w-4 mr-1" /> Review asset
                      </Button>
                    )}
                    {row.kind === "scheduled_post" && row.image_url && !linked.length && (
                      <Button variant="outline" size="sm" onClick={() => openReview({
                        file_name: `${row.platform ?? "post"} image`,
                        url: row.image_url,
                        agent_source: row.agent_source,
                        contextTitle: row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : undefined,
                      })}>
                        <Eye className="h-4 w-4 mr-1" /> Review post image
                      </Button>
                    )}
                    {linked.map((a) => (
                      <Button key={a.id} variant="outline" size="sm" onClick={() => openReview({
                        id: a.id,
                        file_name: a.file_name,
                        label: a.label,
                        file_path: a.file_path,
                        url: a.url,
                        source_url: a.source_url,
                        campaign_id: a.campaign_id,
                        is_published: a.is_published,
                        agent_source: a.agent_source,
                        notes: a.notes,
                        contextTitle: row.kind === "campaign" ? row.title ?? undefined : undefined,
                      })}>
                        <Eye className="h-4 w-4 mr-1" /> {a.label ?? a.file_name ?? "asset"}
                      </Button>
                    ))}
                  </div>
                )}

                {row.feedback_note && (
                  <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
                    <span className="font-semibold">Previous feedback:</span> {row.feedback_note}
                  </div>
                )}

                {canDecide && (
                  <Textarea
                    placeholder="Optional feedback for the creator (required-ish on reject)"
                    value={feedbackById[row.id] ?? ""}
                    onChange={(e) => setFeedbackById((m) => ({ ...m, [row.id]: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                )}

                {canDecide ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() => onDecide(row, false)}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() => onDecide(row, true)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-right">
                    Awaiting review by a tenant Admin or Manager.
                  </p>
                )}

              </CardContent>
            </Card>
          );
        })}
          </div>
        </section>
        );
      })}


      <AssetReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} asset={reviewAsset} />
    </div>
  );
}
