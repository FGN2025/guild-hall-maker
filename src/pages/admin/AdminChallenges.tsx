import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target, Trash2, LayoutGrid, List, Search, Calendar, Users, Clock, Star,
  Gamepad2, FileText, Eye, Shield, Plus, Pencil, ClipboardList, CheckCircle2, XCircle, Image as ImageIcon, Megaphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import CreateChallengeDialog from "@/components/challenges/CreateChallengeDialog";
import EditChallengeDialog from "@/components/challenges/EditChallengeDialog";
import { EventPromoEditorDialog, buildChallengePromo } from "@/components/marketing/EventPromoEditor";
import type { PromoData } from "@/components/marketing/EventPromoEditor";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

const typeLabels: Record<string, string> = {
  one_time: "One-Time",
  daily: "Daily",
  weekly: "Weekly",
};

const ALL_DIFFICULTIES = ["all", "beginner", "intermediate", "advanced"];
const ALL_STATUSES = ["all", "active", "inactive"];

const AdminChallenges = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailChallenge, setDetailChallenge] = useState<any | null>(null);
  const [editChallenge, setEditChallenge] = useState<any | null>(null);
  const [reviewChallengeId, setReviewChallengeId] = useState<string | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});
  const [promoData, setPromoData] = useState<PromoData | null>(null);
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => {
      const { data: challengeData, error } = await supabase
        .from("challenges")
        .select("*, games(name, slug, cover_image_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: enrollments } = await supabase
        .from("challenge_enrollments")
        .select("challenge_id");

      const enrollCounts = new Map<string, number>();
      (enrollments ?? []).forEach((e: any) => {
        enrollCounts.set(e.challenge_id, (enrollCounts.get(e.challenge_id) ?? 0) + 1);
      });

      return (challengeData ?? []).map((c: any) => ({
        ...c,
        enrollments_count: enrollCounts.get(c.id) ?? 0,
      }));
    },
  });

  const filtered = useMemo(() => {
    return challenges.filter((c: any) => {
      if (difficultyFilter !== "all" && c.difficulty !== difficultyFilter) return false;
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "inactive" && c.is_active) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.games?.name ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [challenges, search, difficultyFilter, statusFilter]);

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      toast.success("Challenge deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("challenges").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: string }) => {
      const { error } = await supabase.from("challenge_enrollments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-review-enrollments"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEvidenceStatusMutation = useMutation({
    mutationFn: async ({ evidenceId, status, reviewer_notes }: { evidenceId: string; status: string; reviewer_notes?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("challenge_evidence")
        .update({
          status,
          reviewer_notes: reviewer_notes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        } as any)
        .eq("id", evidenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-review-enrollments"] });
      toast.success("Evidence status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Evidence review queries ──
  const { data: reviewTasks = [] } = useQuery({
    queryKey: ["admin-review-tasks", reviewChallengeId],
    enabled: !!reviewChallengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_tasks")
        .select("id, title, display_order")
        .eq("challenge_id", reviewChallengeId!)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviewEnrollments = [] } = useQuery({
    queryKey: ["admin-review-enrollments", reviewChallengeId],
    enabled: !!reviewChallengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_enrollments")
        .select("*, challenge_evidence(*)")
        .eq("challenge_id", reviewChallengeId!)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      const userIds = (data ?? []).map((e: any) => e.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.display_name; });
      return (data ?? []).map((e: any) => ({ ...e, display_name: nameMap[e.user_id] || "Unknown" }));
    },
  });

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDetailChallenge(null);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          Challenge Management
        </h1>
        <div className="flex items-center gap-2">
          <CreateChallengeDialog
            invalidateQueryKey={["admin-challenges"]}
            trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> New Challenge</Button>}
          />
        </div>
      </div>

      <Tabs defaultValue="oversight">
        <TabsList>
          <TabsTrigger value="oversight" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Oversight</TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5"><Eye className="h-4 w-4" /> Evidence Review</TabsTrigger>
        </TabsList>

        {/* ═══════ OVERSIGHT TAB ═══════ */}
        <TabsContent value="oversight" className="mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search challenges…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                {ALL_DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>{d === "all" ? "All Difficulties" : d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No challenges found.</p>
          ) : viewMode === "list" ? (
            /* ───── LIST VIEW ───── */
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailChallenge(c)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.games?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${difficultyColor[c.difficulty] ?? ""}`}>{c.difficulty}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{typeLabels[c.challenge_type] ?? c.challenge_type}</TableCell>
                      <TableCell className="text-muted-foreground">{c.enrollments_count}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch checked={c.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })} />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditChallenge(c)}>
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/challenges/${c.id}`)}>
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* ───── GRID VIEW ───── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((c: any) => (
                <Card
                  key={c.id}
                  className="overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] bg-card/70 backdrop-blur-sm border-border"
                  onClick={() => setDetailChallenge(c)}
                >
                  {/* Hero */}
                  <div className="relative h-36 bg-muted overflow-hidden">
                    {(c.cover_image_url || c.games?.cover_image_url) ? (
                      <img src={c.cover_image_url || c.games.cover_image_url} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                        <Target className="h-10 w-10 text-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge variant="outline" className={`capitalize ${difficultyColor[c.difficulty] ?? ""}`}>{c.difficulty}</Badge>
                    </div>
                    <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={c.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })} />
                    </div>
                  </div>

                  <CardContent className="p-5 flex flex-col gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-foreground line-clamp-1">{c.name}</h3>
                      <p className="text-sm text-muted-foreground">{c.games?.name ?? "No game"} · {typeLabels[c.challenge_type] ?? c.challenge_type}</p>
                    </div>

                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted rounded-lg p-2">
                        <Users className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                        <p className="font-heading text-xs font-semibold text-foreground">{c.enrollments_count}</p>
                        <p className="text-[10px] text-muted-foreground">Enrolled</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <Star className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                        <p className="font-heading text-xs font-semibold text-foreground">{c.points_first}</p>
                        <p className="text-[10px] text-muted-foreground">1st Pts</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <Clock className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                        <p className="font-heading text-xs font-semibold text-foreground">{c.estimated_minutes ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground">Min</p>
                      </div>
                    </div>

                    {/* Admin actions */}
                    <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => setEditChallenge(c)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/challenges/${c.id}`)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPromoData(buildChallengePromo(c))}>
                        <Megaphone className="h-3.5 w-3.5 mr-1" /> Promo
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="ml-auto text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════ EVIDENCE REVIEW TAB ═══════ */}
        <TabsContent value="review" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Challenge to Review</Label>
            <Select value={reviewChallengeId || ""} onValueChange={setReviewChallengeId}>
              <SelectTrigger><SelectValue placeholder="Choose a challenge..." /></SelectTrigger>
              <SelectContent>
                {challenges.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reviewChallengeId && reviewEnrollments.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No enrollments yet.</CardContent></Card>
          )}

          {reviewEnrollments.map((enrollment: any) => {
            const taskMap: Record<string, any> = {};
            (reviewTasks as any[]).forEach((t: any) => { taskMap[t.id] = t; });

            return (
              <Card key={enrollment.id}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{enrollment.display_name}</p>
                      <p className="text-xs text-muted-foreground">Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{enrollment.status}</Badge>
                  </div>

                  {enrollment.challenge_evidence?.length > 0 && (
                    <div className="space-y-3">
                      {enrollment.challenge_evidence.map((e: any) => {
                        const task = e.task_id ? taskMap[e.task_id] : null;
                        const statusColor = e.status === "approved"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : e.status === "rejected"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";

                        return (
                          <div key={e.id} className="rounded-lg border border-border p-3 space-y-2 bg-card/50">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {task && <span className="text-xs font-medium text-muted-foreground truncate">Task: {task.title}</span>}
                                {!task && <span className="text-xs text-muted-foreground">General evidence</span>}
                              </div>
                              <Badge className={`text-xs shrink-0 ${statusColor}`}>{e.status || "pending"}</Badge>
                            </div>

                            <div className="rounded border border-border overflow-hidden aspect-video max-w-xs bg-muted">
                              {e.file_type === "image" ? (
                                <a href={e.file_url} target="_blank" rel="noopener noreferrer">
                                  <img src={e.file_url} alt="Evidence" className="w-full h-full object-cover" />
                                </a>
                              ) : e.file_type === "video" ? (
                                <video src={e.file_url} controls className="w-full h-full object-cover" />
                              ) : (
                                <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-full">
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                </a>
                              )}
                            </div>

                            {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                            {e.reviewer_notes && <p className="text-xs text-muted-foreground italic">Reviewer: {e.reviewer_notes}</p>}

                            {e.status !== "approved" && enrollment.status === "submitted" && (
                              <div className="flex items-center gap-2 pt-1">
                                <Input
                                  placeholder="Feedback notes (optional)..."
                                  className="text-xs h-8 flex-1"
                                  value={evidenceNotes[e.id] || ""}
                                  onChange={(ev) => setEvidenceNotes(prev => ({ ...prev, [e.id]: ev.target.value }))}
                                />
                                <Button
                                  size="sm" variant="outline" className="gap-1 h-8 text-xs"
                                  onClick={() => {
                                    updateEvidenceStatusMutation.mutate({ evidenceId: e.id, status: "approved", reviewer_notes: evidenceNotes[e.id] });
                                    setEvidenceNotes(prev => { const n = { ...prev }; delete n[e.id]; return n; });
                                  }}
                                  disabled={updateEvidenceStatusMutation.isPending}
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Approve
                                </Button>
                                <Button
                                  size="sm" variant="destructive" className="gap-1 h-8 text-xs"
                                  onClick={() => {
                                    updateEvidenceStatusMutation.mutate({ evidenceId: e.id, status: "rejected", reviewer_notes: evidenceNotes[e.id] });
                                    setEvidenceNotes(prev => { const n = { ...prev }; delete n[e.id]; return n; });
                                  }}
                                  disabled={updateEvidenceStatusMutation.isPending}
                                >
                                  <XCircle className="h-3 w-3" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {enrollment.status === "submitted" && (
                    <div className="flex gap-2 border-t border-border pt-3">
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
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* ───── DETAILS DIALOG ───── */}
      <Dialog open={!!detailChallenge} onOpenChange={(open) => !open && setDetailChallenge(null)}>
        {detailChallenge && (
          <DialogContent className="border-border/50 max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`capitalize ${difficultyColor[detailChallenge.difficulty] ?? ""}`}>
                  {detailChallenge.difficulty}
                </Badge>
                <Badge variant="outline" className={detailChallenge.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground border-border"}>
                  {detailChallenge.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <DialogTitle className="font-display text-2xl">{detailChallenge.name}</DialogTitle>
              <DialogDescription>{detailChallenge.games?.name ?? "No game"} · {typeLabels[detailChallenge.challenge_type] ?? detailChallenge.challenge_type}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {detailChallenge.description && (
                <p className="text-sm text-muted-foreground">{detailChallenge.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Users, label: "Enrolled", value: detailChallenge.enrollments_count },
                  { icon: Clock, label: "Est. Time", value: detailChallenge.estimated_minutes ? `${detailChallenge.estimated_minutes} min` : "—" },
                  { icon: Star, label: "1st Place Pts", value: detailChallenge.points_first },
                  { icon: Shield, label: "Evidence Req.", value: detailChallenge.requires_evidence ? "Yes" : "No" },
                  ...(detailChallenge.start_date ? [{ icon: Calendar, label: "Start", value: format(new Date(detailChallenge.start_date), "MMM d, yyyy") }] : []),
                  ...(detailChallenge.end_date ? [{ icon: Calendar, label: "End", value: format(new Date(detailChallenge.end_date), "MMM d, yyyy") }] : []),
                ].map((info) => (
                  <div key={info.label} className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <info.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">{info.label}</span>
                    </div>
                    <p className="font-heading text-sm font-semibold text-foreground">{info.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-muted rounded-lg p-4">
                <span className="font-heading text-sm text-foreground">Points Breakdown</span>
                <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                  {[
                    { label: "1st", value: detailChallenge.points_first },
                    { label: "2nd", value: detailChallenge.points_second },
                    { label: "3rd", value: detailChallenge.points_third },
                    { label: "Others", value: detailChallenge.points_participation },
                  ].map((p) => (
                    <div key={p.label}>
                      <p className="font-heading text-lg font-bold text-primary">{p.value}</p>
                      <p className="text-[10px] text-muted-foreground">{p.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggle active in dialog */}
              <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                <Label className="text-sm">Active Status</Label>
                <Switch
                  checked={detailChallenge.is_active}
                  onCheckedChange={(checked) => {
                    toggleMutation.mutate({ id: detailChallenge.id, is_active: checked });
                    setDetailChallenge({ ...detailChallenge, is_active: checked });
                  }}
                />
              </div>

              {/* Admin action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full py-5"
                  onClick={() => { setEditChallenge(detailChallenge); setDetailChallenge(null); }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit Challenge
                </Button>

                <Button
                  variant="outline"
                  className="w-full py-5"
                  onClick={() => { navigate(`/challenges/${detailChallenge.id}`); setDetailChallenge(null); }}
                >
                  <Eye className="h-4 w-4 mr-2" /> View Challenge
                </Button>

                <Button
                  variant="outline"
                  className="w-full py-5 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(detailChallenge.id, detailChallenge.name)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Challenge
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ───── EDIT DIALOG ───── */}
      <EditChallengeDialog
        challenge={editChallenge}
        open={!!editChallenge}
        onOpenChange={(open) => !open && setEditChallenge(null)}
        invalidateQueryKey={["admin-challenges"]}
      />

      {/* ───── DELETE CONFIRMATION ───── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challenge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>? This will also remove all enrollments, evidence, and task data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminChallenges;
