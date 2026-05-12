import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, XCircle, ChevronDown, ChevronRight, Image as ImageIcon,
  AlertCircle, Send, FileQuestion, RefreshCw, Inbox, Search,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import RejectionReasonSelect, { encodeReviewerNotes } from "@/components/challenges/RejectionReasonSelect";
import { toast } from "sonner";
import { format } from "date-fns";

type StatusFilter = "submitted" | "completed" | "rejected" | "all";

interface Props {
  /** "moderator" hides admin-only force-submit; "admin" shows it */
  mode: "moderator" | "admin";
}

const statusBadge: Record<string, string> = {
  submitted: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  enrolled: "bg-muted text-muted-foreground border-border",
};

export default function EvidenceReviewInbox({ mode }: Props) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("submitted");
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});
  const [evidenceReason, setEvidenceReason] = useState<Record<string, string | null>>({});
  const [resyncing, setResyncing] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["evidence-review-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["pending-review-count"] });
  };

  // Pull all enrollments worth showing in the inbox plus their challenge & evidence.
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["evidence-review-inbox", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("challenge_enrollments")
        .select(`
          *,
          challenge_evidence(*),
          challenges:challenge_id(id, name, games(name))
        `)
        .order("updated_at", { ascending: false })
        .order("enrolled_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      } else {
        query = query.in("status", ["submitted", "completed", "rejected"]);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((e: any) => e.user_id))];
      const challengeIds = [...new Set((data ?? []).map((e: any) => e.challenge_id))];

      const [{ data: profiles }, { data: tasks }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("user_id, display_name").in("user_id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        challengeIds.length
          ? supabase.from("challenge_tasks").select("id, title, display_order, challenge_id").in("challenge_id", challengeIds).order("display_order")
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const nameMap = new Map<string, string>();
      (profiles ?? []).forEach((p: any) => nameMap.set(p.user_id, p.display_name));

      const taskMap = new Map<string, any[]>();
      (tasks ?? []).forEach((t: any) => {
        if (!taskMap.has(t.challenge_id)) taskMap.set(t.challenge_id, []);
        taskMap.get(t.challenge_id)!.push(t);
      });

      return (data ?? []).map((e: any) => ({
        ...e,
        display_name: nameMap.get(e.user_id) || "Unknown",
        tasks: taskMap.get(e.challenge_id) ?? [],
      }));
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter((e: any) =>
      (e.display_name || "").toLowerCase().includes(q) ||
      (e.challenges?.name || "").toLowerCase().includes(q) ||
      (e.challenges?.games?.name || "").toLowerCase().includes(q)
    );
  }, [enrollments, search]);

  const updateEvidenceStatusMutation = useMutation({
    mutationFn: async ({ evidenceId, status, reviewer_notes }: { evidenceId: string; status: "approved" | "rejected"; reviewer_notes?: string }) => {
      const { error } = await supabase
        .from("challenge_evidence")
        .update({ status, reviewer_notes })
        .eq("id", evidenceId);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Evidence updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: "completed" | "rejected" }) => {
      const enrollment: any = enrollments.find((e: any) => e.id === enrollmentId);
      const { error } = await supabase
        .from("challenge_enrollments")
        .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
        .eq("id", enrollmentId);
      if (error) throw error;
      return enrollment;
    },
    onSuccess: async (enrollment: any, vars) => {
      invalidateAll();
      toast.success(`Enrollment ${vars.status}`);
      if (vars.status === "completed" && enrollment) {
        // Best-effort academy sync
        supabase.functions.invoke("sync-to-academy", {
          body: { user_id: enrollment.user_id, challenge_id: enrollment.challenge_id },
        }).then(({ data }) => {
          if (data?.success) toast.success("Progress synced to FGN Academy");
          else if (data?.user_not_found) toast.info("Player not yet registered on FGN Academy — sync skipped");
          else if (data?.work_order_missing) toast.warning("Academy work order missing — ops action required");
          else if (data?.message) toast.warning(`Academy sync: ${data.message}`);
        }).catch(() => {});
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const forceSubmitMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from("challenge_enrollments")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Marked as submitted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const renderEvidenceItem = (e: any, isSubmitted: boolean) => {
    const evStatusColor = e.status === "approved"
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : e.status === "rejected"
        ? "bg-red-500/20 text-red-400 border-red-500/30"
        : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";

    const ytMatch = e.file_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    const twitchClipMatch = e.file_url?.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/);
    const twitchVideoMatch = e.file_url?.match(/twitch\.tv\/videos\/(\d+)/);

    return (
      <div key={e.id} className="rounded-lg border border-border p-3 space-y-2 bg-card/50">
        <div className="flex items-center justify-end gap-2">
          <Badge className={`text-xs shrink-0 ${evStatusColor}`}>{e.status || "pending"}</Badge>
        </div>
        <div className="rounded border border-border overflow-hidden aspect-video max-w-xs bg-muted">
          {e.file_type === "image" ? (
            <a href={e.file_url} target="_blank" rel="noopener noreferrer">
              <img src={e.file_url} alt="Evidence" className="w-full h-full object-cover" />
            </a>
          ) : e.file_type === "video" ? (
            <video src={e.file_url} controls preload="metadata" className="w-full h-full object-cover" />
          ) : e.file_type === "video_link" && ytMatch ? (
            <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
          ) : e.file_type === "video_link" && twitchClipMatch ? (
            <iframe src={`https://clips.twitch.tv/embed?clip=${twitchClipMatch[1]}&parent=${window.location.hostname}`} title="Twitch clip" allowFullScreen className="w-full h-full" />
          ) : e.file_type === "video_link" && twitchVideoMatch ? (
            <iframe src={`https://player.twitch.tv/?video=${twitchVideoMatch[1]}&parent=${window.location.hostname}`} title="Twitch video" allowFullScreen className="w-full h-full" />
          ) : (
            <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-full">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </a>
          )}
        </div>
        {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
        {e.reviewer_notes && <p className="text-xs text-muted-foreground italic">Reviewer: {e.reviewer_notes}</p>}

        {e.status !== "approved" && isSubmitted && (
          <div className="space-y-1.5 pt-1">
            <RejectionReasonSelect
              value={evidenceReason[e.id] ?? null}
              onChange={(code) => setEvidenceReason((p) => ({ ...p, [e.id]: code }))}
              disabled={updateEvidenceStatusMutation.isPending}
            />
            <div className="flex items-center gap-2">
              <Input
                placeholder="Feedback notes (optional)..."
                className="text-xs h-8 flex-1"
                value={evidenceNotes[e.id] || ""}
                onChange={(ev) => setEvidenceNotes((prev) => ({ ...prev, [e.id]: ev.target.value }))}
              />
              <Button
                size="sm" variant="outline" className="gap-1 h-8 text-xs"
                onClick={() => {
                  updateEvidenceStatusMutation.mutate({ evidenceId: e.id, status: "approved", reviewer_notes: evidenceNotes[e.id] });
                  setEvidenceNotes((prev) => { const n = { ...prev }; delete n[e.id]; return n; });
                  setEvidenceReason((prev) => { const n = { ...prev }; delete n[e.id]; return n; });
                }}
                disabled={updateEvidenceStatusMutation.isPending}
              >
                <CheckCircle2 className="h-3 w-3" /> Approve
              </Button>
              <Button
                size="sm" variant="destructive" className="gap-1 h-8 text-xs"
                onClick={() => {
                  const composed = encodeReviewerNotes(evidenceReason[e.id] ?? null, evidenceNotes[e.id] || "");
                  updateEvidenceStatusMutation.mutate({ evidenceId: e.id, status: "rejected", reviewer_notes: composed });
                  setEvidenceNotes((prev) => { const n = { ...prev }; delete n[e.id]; return n; });
                  setEvidenceReason((prev) => { const n = { ...prev }; delete n[e.id]; return n; });
                }}
                disabled={updateEvidenceStatusMutation.isPending}
              >
                <XCircle className="h-3 w-3" /> Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by player, challenge, or game…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="submitted">Pending review</SelectItem>
            <SelectItem value="completed">Recently completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All (submitted + decided)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty / loading */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <Inbox className="h-8 w-8 mx-auto opacity-60" />
            <p>{statusFilter === "submitted" ? "Inbox zero — no pending reviews." : "No enrollments match this filter."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border bg-card/30 overflow-hidden">
          {filtered.map((enrollment: any) => {
            const isOpen = !!openIds[enrollment.id];
            const isSubmitted = enrollment.status === "submitted";
            const evidence = enrollment.challenge_evidence ?? [];
            const approvedCount = evidence.filter((e: any) => e.status === "approved").length;
            const totalEvidence = evidence.length;

            const evidenceByTask: Record<string, any[]> = {};
            const generalEvidence: any[] = [];
            evidence.forEach((ev: any) => {
              if (ev.task_id) (evidenceByTask[ev.task_id] ||= []).push(ev);
              else generalEvidence.push(ev);
            });

            return (
              <Collapsible
                key={enrollment.id}
                open={isOpen}
                onOpenChange={(o) => setOpenIds((p) => ({ ...p, [enrollment.id]: o }))}
              >
                <CollapsibleTrigger className="w-full text-left hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-3 px-4 py-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{enrollment.challenges?.name || "Challenge"}</p>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-sm text-muted-foreground truncate">{enrollment.display_name}</p>
                        {enrollment.challenges?.games?.name && (
                          <Badge variant="outline" className="text-[10px] h-5">{enrollment.challenges.games.name}</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {enrollment.submitted_at
                          ? `Submitted ${format(new Date(enrollment.submitted_at), "MMM d, h:mm a")}`
                          : `Enrolled ${format(new Date(enrollment.enrolled_at), "MMM d")}`}
                        {totalEvidence > 0 && ` · ${approvedCount}/${totalEvidence} evidence approved`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`capitalize shrink-0 ${statusBadge[enrollment.status] || ""}`}>{enrollment.status}</Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 border-t border-border/60 bg-background/40">
                    {!isSubmitted && enrollment.status !== "completed" && enrollment.status !== "rejected" && (
                      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-start gap-2 text-xs mt-3">
                        <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-yellow-300">Awaiting player submission</p>
                          <p className="text-muted-foreground">
                            The player must tap <span className="font-medium">Submit for Review</span> on the challenge page before approval.
                            {totalEvidence > 0 ? " Evidence has been uploaded but not yet submitted." : " No evidence uploaded yet."}
                          </p>
                          {(mode === "admin" || isAdmin) && totalEvidence > 0 && (
                            <Button
                              size="sm" variant="outline" className="gap-1 h-7 text-xs mt-2"
                              onClick={() => forceSubmitMutation.mutate(enrollment.id)}
                              disabled={forceSubmitMutation.isPending}
                            >
                              <Send className="h-3 w-3" /> Force submit (admin)
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {enrollment.tasks.length > 0 && (
                      <div className="space-y-4 pt-3">
                        {enrollment.tasks.map((task: any) => {
                          const items = evidenceByTask[task.id] ?? [];
                          return (
                            <div key={task.id} className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Task: {task.title}</p>
                              {items.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border p-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/20">
                                  <FileQuestion className="h-4 w-4" />
                                  No evidence uploaded for this task yet.
                                </div>
                              ) : (
                                <div className="space-y-3">{items.map((it) => renderEvidenceItem(it, isSubmitted))}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {generalEvidence.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">General evidence</p>
                        <div className="space-y-3">{generalEvidence.map((it) => renderEvidenceItem(it, isSubmitted))}</div>
                      </div>
                    )}

                    {isSubmitted && (
                      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                        <Button
                          size="sm" className="gap-1"
                          onClick={() => updateStatusMutation.mutate({ enrollmentId: enrollment.id, status: "completed" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve All & Complete
                        </Button>
                        <Button
                          size="sm" variant="destructive" className="gap-1"
                          onClick={() => updateStatusMutation.mutate({ enrollmentId: enrollment.id, status: "rejected" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject Enrollment
                        </Button>
                      </div>
                    )}

                    {enrollment.status === "completed" && (mode === "admin" || isAdmin) && (
                      <div className="flex gap-2 border-t border-border pt-3">
                        <Button
                          size="sm" variant="outline" className="gap-1"
                          disabled={resyncing === enrollment.id}
                          onClick={async () => {
                            setResyncing(enrollment.id);
                            try {
                              const { data, error } = await supabase.functions.invoke("sync-to-academy", {
                                body: { user_id: enrollment.user_id, challenge_id: enrollment.challenge_id },
                              });
                              if (error) throw error;
                              if (data?.success) toast.success("Academy sync completed");
                              else toast.error(data?.message || "Sync failed");
                            } catch (err: any) {
                              toast.error("Sync error: " + (err.message || "Unknown"));
                            } finally {
                              setResyncing(null);
                            }
                          }}
                        >
                          {resyncing === enrollment.id
                            ? <div className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
                            : <RefreshCw className="h-3.5 w-3.5" />}
                          Retry Academy Sync
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
