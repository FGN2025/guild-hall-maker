import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Bot, Check, X, Loader2, MessageSquare, Image as ImageIcon, CalendarClock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  scheduled_at?: string | null;
  status: string;
  feedback_note?: string | null;
  agent_source?: string | null;
  created_at: string;
  updated_at: string;
}

export default function AgentDraftsPanel({ tenantId }: { tenantId: string | null | undefined }) {
  const qc = useQueryClient();
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["agent_drafts", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<DraftRow[]> => {
      const thirtyDays = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [campaigns, posts, assets] = await Promise.all([
        supabase
          .from("marketing_campaigns" as any)
          .select("id, title, description, social_copy, status, feedback_note, agent_source, created_at, updated_at")
          .eq("tenant_id", tenantId!)
          .not("agent_source", "is", null)
          .or(`status.eq.pending_review,and(status.eq.rejected,updated_at.gte.${thirtyDays})`)
          .order("updated_at", { ascending: false }),
        supabase
          .from("scheduled_posts" as any)
          .select("id, platform, caption, image_url, scheduled_at, status, feedback_note, agent_source, created_at, updated_at")
          .eq("tenant_id", tenantId!)
          .not("agent_source", "is", null)
          .or(`status.eq.pending_review,and(status.eq.rejected,updated_at.gte.${thirtyDays})`)
          .order("updated_at", { ascending: false }),
        supabase
          .from("tenant_marketing_assets" as any)
          .select("id, file_name, url, label, is_published, agent_source, notes, created_at, updated_at")
          .eq("tenant_id", tenantId!)
          .not("agent_source", "is", null)
          .eq("is_published", false)
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

  const decide = useMutation({
    mutationFn: async ({ row, approve }: { row: DraftRow; approve: boolean }) => {
      const table =
        row.kind === "campaign" ? "marketing_campaigns" :
        row.kind === "scheduled_post" ? "scheduled_posts" : "tenant_marketing_assets";
      const note = feedbackById[row.id]?.trim() || null;

      let patch: Record<string, unknown>;
      if (row.kind === "asset") {
        patch = approve
          ? { is_published: true, notes: note ?? row.description ?? null }
          : { notes: note ? `[Rejected] ${note}` : "[Rejected]" };
      } else if (row.kind === "scheduled_post") {
        patch = approve
          ? { status: "pending", feedback_note: note }
          : { status: "rejected", feedback_note: note };
      } else {
        patch = approve
          ? { status: "approved", is_published: true, feedback_note: note }
          : { status: "rejected", feedback_note: note };
      }

      const { error } = await supabase.from(table as any).update(patch).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.approve ? "Approved" : "Rejected with feedback");
      qc.invalidateQueries({ queryKey: ["agent_drafts", tenantId] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Update failed"),
  });

  if (!tenantId) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Join a tenant to see agent drafts.</CardContent></Card>;
  }
  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === "pending_review");
  const rejected = rows.filter((r) => r.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-heading">Agent drafts</h2>
        <Badge variant="secondary">{pending.length} pending</Badge>
        {rejected.length > 0 && <Badge variant="outline">{rejected.length} rejected (30d)</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        Nothing here publishes automatically. Approve to move a draft into the live workflow; reject with a note so the agent can revise it.
      </p>

      {rows.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No agent drafts yet.</CardContent></Card>
      )}

      <div className="grid gap-4">
        {rows.map((row) => (
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
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Updated {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })} · {row.agent_source ?? "agent"}
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

              {row.feedback_note && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
                  <span className="font-semibold">Previous feedback:</span> {row.feedback_note}
                </div>
              )}

              <Textarea
                placeholder="Optional feedback for the agent (required-ish on reject)"
                value={feedbackById[row.id] ?? ""}
                onChange={(e) => setFeedbackById((m) => ({ ...m, [row.id]: e.target.value }))}
                rows={2}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ row, approve: false })}
                >
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ row, approve: true })}
                >
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
