import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { Bot, Check, X, Loader2, MessageSquare, Image as ImageIcon, CalendarClock, Eye, Link2, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AssetReviewDialog, type AssetReviewItem } from "./AssetReviewDialog";
import AssetEditorDialog, { type AssetSaveMeta } from "@/components/media/AssetEditorDialog";
import { derivePromoArgs, beatLabelFromOverlays } from "@/lib/promo/derivePromoArgs";
import { useTenantMarketingAssets } from "@/hooks/useTenantMarketingAssets";
import { useDraftDecision } from "@/hooks/useDraftDecision";
import { useAheadPendingPosts, fetchAheadPendingPosts } from "@/hooks/useAheadPendingPosts";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StoredImage } from "@/components/marketing/StoredImage";
import PostArtworkDialog, { beatFromPath } from "./PostArtworkDialog";
import { TENANT_REVIEW_QUEUE_KEY } from "@/hooks/useTenantReviewQueue";


/** Image a reviewer chose to open in the editor. */
interface EditTarget {
  id?: string | null;
  campaign_id?: string | null;
  file_name?: string | null;
  label?: string | null;
  url: string;
  source_url?: string | null;
  overlay_config?: Record<string, any> | null;
}


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
  image_path?: string | null;
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
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  /** Full-resolution artwork viewer; only the opened post loads native res. */
  const [artwork, setArtwork] = useState<null | {
    path?: string | null; url?: string | null; title?: string | null;
    beat?: string | null; scheduledAt?: string | null; caption?: string | null;
  }>(null);
  const qc = useQueryClient();
  const { uploadAsset } = useTenantMarketingAssets();
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
          .select("id, campaign_id, platform, caption, image_url, image_path, scheduled_at, status, feedback_note, agent_source, created_at, updated_at, conflict_flagged_at, conflict_details, undeliverable_reason")
          .eq("tenant_id", tenantId!)
          // Stale-window failures surface here too, so an approved post the
          // dispatcher refused (too old) is visible with its reason instead of
          // silently disappearing from the queue.
          .or(`status.eq.pending_review,and(status.eq.rejected,updated_at.gte.${thirtyDays}),and(status.eq.failed,undeliverable_reason.eq.stale_window)`)
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
    qc.invalidateQueries({ queryKey: ["ahead_pending_posts", tenantId] });
    if (failures.length) {
      toast.error(`Approved ${ok} of ${targets.length}. ${failures.length} failed: ${failures[0]}`);
    } else {
      toast.success(`Approved ${ok} draft${ok === 1 ? "" : "s"}`);
    }
  };

  // ---- Ahead-only bulk approve -------------------------------------------
  // Acts on scheduled posts whose slot is still in the future. The cutoff is
  // evaluated by Postgres (see useAheadPendingPosts), never by the browser
  // clock, so two reviewers in different timezones act on the same set. This is
  // a FILTER over the existing approval path — it writes status only through
  // useDraftDecision, exactly like the other bulk buttons.
  const { data: ahead } = useAheadPendingPosts(tenantId);
  const [aheadConfirm, setAheadConfirm] = useState<{ rows: DraftRow[]; cutoff: string | null } | null>(null);
  /** Confirmation gate for the unbounded bulk approvals (all / this week). */
  const [bulkConfirm, setBulkConfirm] = useState<{ key: string; rows: DraftRow[]; label: string } | null>(null);


  const aheadRows = useMemo(() => {
    const idSet = new Set(ahead?.ids ?? []);
    return rows.filter((r) => r.kind === "scheduled_post" && r.status === "pending_review" && idSet.has(r.id));
  }, [rows, ahead]);

  const openAheadConfirm = async () => {
    if (!tenantId) return;
    try {
      // Re-read at click time so an aged-out slot can't slip through on a stale cache.
      const fresh = await fetchAheadPendingPosts(tenantId);
      const idSet = new Set(fresh.ids);
      const targets = rows.filter(
        (r) => r.kind === "scheduled_post" && r.status === "pending_review" && idSet.has(r.id),
      );
      setAheadConfirm({ rows: targets, cutoff: fresh.serverNow });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not read the upcoming set");
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

  /** Open the shared image editor on a pending draft so reviewers can fix
   *  small issues (typos, framing) instead of rejecting the whole draft.
   *
   *  The list rows don't carry background_url/overlay_config, so fetch them
   *  here: the editor must open on the TEXT-FREE plate with the copy hydrated
   *  as live layers, otherwise the baked-in headline is what gets cropped when
   *  the reviewer switches format. */
  async function openEditor(a: EditTarget) {
    setEditTarget(a);
    if (!a.id) return;
    const { data } = await supabase
      .from("tenant_marketing_assets")
      .select("background_url, overlay_config, campaign_id")
      .eq("id", a.id)
      .maybeSingle();
    if (!data) return;
    let cfg = ((data as any).overlay_config as Record<string, any>) ?? null;
    // Legacy assets predate persisted composer inputs; rebuild them from the
    // campaign's event so a format switch can re-layout, not just rescale.
    if (cfg && !cfg.promo && (data as any).campaign_id) {
      const { data: camp } = await supabase
        .from("marketing_campaigns")
        .select("source_event_id, source_tournament_id")
        .eq("id", (data as any).campaign_id)
        .maybeSingle();
      const promo = await derivePromoArgs({
        tenantId: tenantInfo?.tenantId,
        sourceEventId: (camp as any)?.source_event_id ?? null,
        sourceTournamentId: (camp as any)?.source_tournament_id ?? null,
        beatLabel: beatLabelFromOverlays(cfg.overlays),
      });
      if (promo) cfg = { ...cfg, promo };
    }
    setEditTarget((cur) =>
      cur && cur.id === a.id
        ? {
            ...cur,
            source_url: (data as any).background_url ?? cur.source_url ?? null,
            overlay_config: cfg ?? cur.overlay_config ?? null,
          }
        : cur
    );
  }



  const handleEditorSave = async (blob: Blob, meta?: AssetSaveMeta) => {
    if (!editTarget) return;
    const file = new File([blob], `review-edit-${Date.now()}.png`, { type: "image/png" });
    await uploadAsset.mutateAsync({
      file,
      label: editTarget.label ?? editTarget.file_name ?? "Reviewed asset",
      sourceAssetId: editTarget.id ?? undefined,
      campaignId: editTarget.campaign_id ?? undefined,
      overlayConfig: meta?.overlayConfig ?? null,
      backgroundUrl: meta?.backgroundUrl ?? editTarget.source_url ?? null,
    });
    setEditTarget(null);
    qc.invalidateQueries({ queryKey: ["agent_drafts", tenantId] });
    qc.invalidateQueries({ queryKey: ["agent_drafts_linked_assets", tenantId] });
    qc.invalidateQueries({ queryKey: [TENANT_REVIEW_QUEUE_KEY] });
  };


  /* Per-row decision feedback: the shared mutation only exposes one global
     isPending, so a reviewer clicking Approve on card 7 saw every card freeze
     and no card change. Track the row being decided and the outcome locally so
     the decided card reads "Approved"/"Rejected" immediately, until the
     refetch removes or re-badges it. */
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decidedById, setDecidedById] = useState<Record<string, "approved" | "rejected">>({});

  const onDecide = (row: DraftRow, approve: boolean) => {
    setDecidingId(row.id);
    decide.mutate(
      { row, approve, note: feedbackById[row.id] },
      {
        onSuccess: () =>
          setDecidedById((m) => ({ ...m, [row.id]: approve ? "approved" : "rejected" })),
        onSettled: () => setDecidingId((cur) => (cur === row.id ? null : cur)),
      },
    );
  };



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
      </div>

      {/* Bulk actions live on their own row, full width on a phone, and every
          one of them is confirmed first. They publish to real public pages, so
          a mis-tap must never be one tap away from a decision button. */}
      {canDecide && (aheadRows.length > 0 || pending.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {aheadRows.length > 0 && (
            <Button
              variant="secondary"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={!!bulkBusyKey}
              onClick={openAheadConfirm}
            >
              {bulkBusyKey === "__ahead__" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CalendarClock className="h-4 w-4 mr-1" />}
              Approve upcoming only ({aheadRows.length})
            </Button>
          )}
          {pending.length > 0 && (
            <Button
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={!!bulkBusyKey}
              onClick={() => setBulkConfirm({ key: "__all__", rows: pending, label: `all ${pending.length} pending item${pending.length === 1 ? "" : "s"}` })}
            >
              {bulkBusyKey === "__all__" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Approve all {pending.length} pending
            </Button>
          )}
        </div>
      )}


      <p className="text-sm text-muted-foreground">
        {canDecide
          ? "Nothing here publishes automatically. Approve to make a draft live; reject with a note so the creator (or agent) can revise it."
          : "Your drafts stay private until a tenant Admin or Manager approves them. Rejection notes appear here."}

      </p>

      {rows.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Nothing waiting for review.</CardContent></Card>
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
            {canDecide && groupPending.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto min-h-[44px]"
                disabled={!!bulkBusyKey}
                onClick={() => setBulkConfirm({ key: group.key, rows: groupPending, label: `${groupPending.length} item${groupPending.length === 1 ? "" : "s"} in ${weekLabel(group.start)}` })}
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
                    <Badge
                      variant={
                        decidedById[row.id] === "approved"
                          ? "default"
                          : decidedById[row.id] === "rejected" || row.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {decidedById[row.id] ?? row.status.replace("_", " ")}
                    </Badge>

                    {(row as any).conflict_flagged_at && (
                      <Badge variant="destructive" className="text-xs">Schedule conflict</Badge>
                    )}
                    {(row as any).undeliverable_reason === "stale_window" ? (
                      <Badge variant="destructive" className="text-xs">
                        Missed window — reschedule to send
                      </Badge>
                    ) : (row as any).undeliverable_reason ? (
                      <Badge variant="destructive" className="text-xs">Undeliverable</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>Updated {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })}</span>
                  <Badge variant="outline" className="text-xs">
                    {row.agent_source ? `AI · ${row.agent_source}` : "Quick Promo"}
                  </Badge>

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
                    {(row.image_path || row.image_url) && (
                      <button
                        type="button"
                        className="shrink-0 rounded overflow-hidden ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Open full-size artwork"
                        onClick={() => setArtwork({
                          path: row.image_path,
                          url: row.image_url,
                          title: `${row.platform ?? "post"} artwork`,
                          beat: beatFromPath(row.image_path),
                          scheduledAt: row.scheduled_at,
                          caption: row.caption,
                        })}
                      >
                        {/* object-contain, portrait box: a square crop cut the
                            headline and prize line off the 4:5 promos, which is
                            exactly the copy a reviewer is checking. */}
                        <StoredImage
                          path={row.image_path}
                          fallbackUrl={row.image_url}
                          transformWidth={256}
                          alt={`Promo artwork for the ${row.platform ?? "post"} scheduled ${row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : "with no time"}`}
                          className="h-[7.5rem] w-24 rounded object-contain bg-muted"
                        />
                        <span className="sr-only">Open full-size artwork</span>
                      </button>
                    )}
                    {row.caption && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{row.caption}</p>}
                  </div>

                )}
                {row.kind === "asset" && (row.file_path || row.url) && (
                  <button
                    type="button"
                    className="block rounded overflow-hidden ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Open full-size artwork"
                    onClick={() => setArtwork({
                      path: row.file_path,
                      url: row.url,
                      title: row.label ?? row.file_name ?? "Asset artwork",
                      beat: beatFromPath(row.file_path, row.file_name),
                      scheduledAt: null,
                      caption: row.notes,
                    })}
                  >
                    <StoredImage
                      path={row.file_path}
                      fallbackUrl={row.url}
                      transformWidth={320}
                      alt={row.label ?? row.file_name ?? "Marketing asset artwork"}
                      className="max-h-40 rounded object-contain bg-muted"
                    />
                  </button>
                )}

                {(row.kind === "asset" || linked.length > 0 || (row.kind === "scheduled_post" && (row.image_url || row.image_path))) && (
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
                    {canDecide && row.kind === "asset" && row.url && (
                      <Button variant="outline" size="sm" onClick={() => openEditor({
                        id: row.id,
                        campaign_id: row.campaign_id,
                        file_name: row.file_name,
                        label: row.label,
                        url: row.url,
                        source_url: row.source_url,
                      })}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit image
                      </Button>
                    )}
                    {row.kind === "scheduled_post" && row.image_url && !linked.length && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openReview({
                          file_name: `${row.platform ?? "post"} image`,
                          url: row.image_url,
                          agent_source: row.agent_source,
                          contextTitle: row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : undefined,
                        })}>
                          <Eye className="h-4 w-4 mr-1" /> Review post image
                        </Button>
                        {canDecide && (
                          <Button variant="outline" size="sm" onClick={() => openEditor({
                            campaign_id: row.campaign_id,
                            file_name: `${row.platform ?? "post"} image`,
                            label: `${row.platform ?? "Post"} image`,
                            url: row.image_url!,
                          })}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit image
                          </Button>
                        )}
                      </>
                    )}
                    {linked.map((a) => (
                      <div key={a.id} className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openReview({
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
                        {canDecide && a.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Edit image"
                            onClick={() => openEditor({
                              id: a.id,
                              campaign_id: a.campaign_id,
                              file_name: a.file_name,
                              label: a.label,
                              url: a.url!,
                              source_url: a.source_url,
                            })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
                  decidedById[row.id] ? (
                    <div className="flex items-center justify-end gap-2 min-h-[44px] text-sm">
                      {decidedById[row.id] === "approved" ? (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Check className="h-4 w-4" /> Approved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive font-medium">
                          <X className="h-4 w-4" /> Rejected
                        </span>
                      )}
                    </div>
                  ) : (
                  /* 44px targets, pushed to opposite ends of the card. Reject
                     and Approve were 36px tall and 8px apart in the bottom-right
                     corner — the exact spot a right thumb lands. */
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      className="min-h-[44px] min-w-[44px] flex-1 max-w-[45%]"
                      disabled={decidingId === row.id}
                      onClick={() => onDecide(row, false)}
                    >
                      {decidingId === row.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}{" "}
                      Reject
                    </Button>
                    <Button
                      className="min-h-[44px] min-w-[44px] flex-1 max-w-[45%]"
                      disabled={decidingId === row.id}
                      onClick={() => onDecide(row, true)}
                    >
                      {decidingId === row.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}{" "}
                      Approve
                    </Button>
                  </div>
                  )
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

      <PostArtworkDialog
        open={!!artwork}
        onOpenChange={(open) => { if (!open) setArtwork(null); }}
        path={artwork?.path}
        fallbackUrl={artwork?.url}
        title={artwork?.title}
        beat={artwork?.beat}
        scheduledAt={artwork?.scheduledAt}
        caption={artwork?.caption}
      />


      {editTarget && (
        <AssetEditorDialog
          open={!!editTarget}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
          baseImageUrl={editTarget.source_url ?? editTarget.url}
          initialOverlayConfig={(editTarget.overlay_config as any) ?? null}
          onSave={handleEditorSave}
        />
      )}

      <ConfirmDialog
        open={!!aheadConfirm}
        onOpenChange={(open) => { if (!open) setAheadConfirm(null); }}
        title={`Approve ${aheadConfirm?.rows.length ?? 0} upcoming post${aheadConfirm?.rows.length === 1 ? "" : "s"}?`}
        description={
          `Only posts still scheduled after ${
            aheadConfirm?.cutoff ? new Date(aheadConfirm.cutoff).toLocaleString() : "the server cutoff"
          } are included. Posts whose slot has already passed, and anything not awaiting review, are left untouched.`
        }
        onConfirm={() => {
          const targets = aheadConfirm?.rows ?? [];
          setAheadConfirm(null);
          if (targets.length) bulkApprove("__ahead__", targets);
        }}
      />

      {/* Unbounded bulk approvals: name the count, warn that lapsed posts are
          included, and require a second tap. */}
      <ConfirmDialog
        open={!!bulkConfirm}
        onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}
        title={`Approve ${bulkConfirm?.label ?? ""}?`}
        description={
          "This approves every one of them at once and they become publishable on your real public pages. Posts whose scheduled slot has already passed are included — those will be held back by the staleness guard and need rescheduling. There is no undo."
        }
        confirmLabel="Approve them all"
        onConfirm={() => {
          const target = bulkConfirm;
          setBulkConfirm(null);
          if (target?.rows.length) bulkApprove(target.key, target.rows);
        }}
      />

    </div>
  );

}
