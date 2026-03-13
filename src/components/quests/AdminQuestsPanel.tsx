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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Compass, Trash2, LayoutGrid, List, Search, Calendar, Users, Clock, Star,
  Shield, Plus, Pencil, ClipboardList, Eye, CheckCircle2, XCircle, Image as ImageIcon, Link2, Megaphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import CreateQuestDialog from "@/components/quests/CreateQuestDialog";
import EditQuestDialog from "@/components/quests/EditQuestDialog";
import AdminChainsTab from "@/components/quests/AdminChainsTab";
import { EventPromoEditorDialog, buildQuestPromo } from "@/components/marketing/EventPromoEditor";
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

interface AdminQuestsPanelProps {
  queryKeyPrefix: string;
  showEnrollmentCounts?: boolean;
}

const AdminQuestsPanel = ({ queryKeyPrefix, showEnrollmentCounts = true }: AdminQuestsPanelProps) => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailQuest, setDetailQuest] = useState<any | null>(null);
  const [editQuest, setEditQuest] = useState<any | null>(null);
  const [reviewQuestId, setReviewQuestId] = useState<string | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});
  const [promoData, setPromoData] = useState<PromoData | null>(null);

  const { data: quests = [], isLoading } = useQuery({
    queryKey: [`${queryKeyPrefix}-quests`],
    queryFn: async () => {
      const { data: questData, error } = await supabase
        .from("quests")
        .select("*, games(name, slug, cover_image_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: enrollments } = await supabase
        .from("quest_enrollments")
        .select("quest_id");

      const enrollCounts = new Map<string, number>();
      (enrollments ?? []).forEach((e: any) => {
        enrollCounts.set(e.quest_id, (enrollCounts.get(e.quest_id) ?? 0) + 1);
      });

      return (questData ?? []).map((q: any) => ({
        ...q,
        enrollments_count: enrollCounts.get(q.id) ?? 0,
      }));
    },
  });

  const filtered = useMemo(() => {
    return quests.filter((q: any) => {
      if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;
      if (statusFilter === "active" && !q.is_active) return false;
      if (statusFilter === "inactive" && q.is_active) return false;
      if (search) {
        const s = search.toLowerCase();
        return q.name.toLowerCase().includes(s) || (q.games?.name ?? "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [quests, search, difficultyFilter, statusFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-quests`] });
      toast.success("Quest deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("quests").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-quests`] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: string }) => {
      // 1. Get enrollment details
      const { data: enrollment, error: enrollErr } = await supabase
        .from("quest_enrollments")
        .select("user_id, quest_id")
        .eq("id", enrollmentId)
        .single();
      if (enrollErr) throw enrollErr;

      // 2. Update status
      const { error } = await supabase.from("quest_enrollments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      if (error) throw error;

      // 3. If completing, award points + record completion + notify
      if (status === "completed" && enrollment && user) {
        const { data: quest } = await supabase
          .from("quests")
          .select("name, points_first, xp_reward, game_id, games(name)")
          .eq("id", enrollment.quest_id)
          .single();

        const points = (quest as any)?.points_first ?? 0;
        const xpReward = (quest as any)?.xp_reward ?? 0;
        const questName = (quest as any)?.name ?? "Quest";

        // Record completion
        await supabase.from("quest_completions").insert({
          user_id: enrollment.user_id,
          quest_id: enrollment.quest_id,
          awarded_points: points,
          verified_by: user.id,
        });

        // Notify the player
        await supabase.from("notifications").insert({
          user_id: enrollment.user_id,
          title: "Quest Approved!",
          message: `Your submission for "${questName}" has been approved! You earned ${points} points${xpReward > 0 ? ` and ${xpReward} XP` : ""}.`,
          type: "quest",
          link: `/quests/${enrollment.quest_id}`,
        });

        // Credit season score
        if (points > 0) {
          await supabase.functions.invoke("award-season-points", {
            body: {
              winner_id: enrollment.user_id,
              points_winner: points,
              game: (quest as any)?.games?.name,
            },
          });
        }

        // Credit quest XP
        if (xpReward > 0) {
          const { data: existing } = await supabase
            .from("player_quest_xp")
            .select("id, total_xp")
            .eq("user_id", enrollment.user_id)
            .maybeSingle();

          if (existing) {
            const newXp = existing.total_xp + xpReward;
            const newRank = newXp >= 1000 ? "master" : newXp >= 600 ? "expert" : newXp >= 300 ? "journeyman" : newXp >= 100 ? "apprentice" : "novice";
            await supabase.from("player_quest_xp").update({
              total_xp: newXp,
              quest_rank: newRank,
              updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
          } else {
            const newRank = xpReward >= 1000 ? "master" : xpReward >= 600 ? "expert" : xpReward >= 300 ? "journeyman" : xpReward >= 100 ? "apprentice" : "novice";
            await supabase.from("player_quest_xp").insert({
              user_id: enrollment.user_id,
              total_xp: xpReward,
              quest_rank: newRank,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-quest-review-enrollments`] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEvidenceStatusMutation = useMutation({
    mutationFn: async ({ evidenceId, status, reviewer_notes }: { evidenceId: string; status: string; reviewer_notes?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("quest_evidence")
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
      queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-quest-review-enrollments`] });
      toast.success("Evidence status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: reviewTasks = [] } = useQuery({
    queryKey: [`${queryKeyPrefix}-quest-review-tasks`, reviewQuestId],
    enabled: !!reviewQuestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_tasks")
        .select("id, title, display_order")
        .eq("quest_id", reviewQuestId!)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviewEnrollments = [] } = useQuery({
    queryKey: [`${queryKeyPrefix}-quest-review-enrollments`, reviewQuestId],
    enabled: !!reviewQuestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_enrollments")
        .select("*, quest_evidence(*)")
        .eq("quest_id", reviewQuestId!)
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
    setDetailQuest(null);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <CreateQuestDialog
          invalidateQueryKey={[`${queryKeyPrefix}-quests`]}
          trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> New Quest</Button>}
        />
      </div>

      <Tabs defaultValue="oversight">
        <TabsList>
          <TabsTrigger value="oversight" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Oversight</TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5"><Eye className="h-4 w-4" /> Evidence Review</TabsTrigger>
          <TabsTrigger value="chains" className="gap-1.5"><Link2 className="h-4 w-4" /> Chains</TabsTrigger>
        </TabsList>

        <TabsContent value="oversight" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search quests…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                {ALL_DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>{d === "all" ? "All Difficulties" : d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No quests found.</p>
          ) : viewMode === "list" ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Type</TableHead>
                    {showEnrollmentCounts && <TableHead>Enrolled</TableHead>}
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((q: any) => (
                    <TableRow key={q.id} className="cursor-pointer" onClick={() => setDetailQuest(q)}>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell className="text-muted-foreground">{q.games?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`capitalize ${difficultyColor[q.difficulty] ?? ""}`}>{q.difficulty}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{typeLabels[q.challenge_type] ?? q.challenge_type}</TableCell>
                      {showEnrollmentCounts && <TableCell className="text-muted-foreground">{q.enrollments_count}</TableCell>}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Switch checked={q.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: q.id, is_active: checked })} />
                                <span className="text-xs text-muted-foreground">{q.is_active ? "Active" : "Inactive"}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Toggle quest visibility for players</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditQuest(q)}><Pencil className="h-4 w-4 text-primary" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/quests/${q.id}`)}><Eye className="h-4 w-4 text-primary" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setPromoData(buildQuestPromo(q))}><Megaphone className="h-4 w-4 text-primary" /></Button>
                          {isAdmin && <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(q.id, q.name)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((q: any) => (
                <Card key={q.id} className="overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] bg-card/70 backdrop-blur-sm border-border" onClick={() => setDetailQuest(q)}>
                  <div className="relative h-36 bg-muted overflow-hidden">
                    {(q.cover_image_url || q.games?.cover_image_url) ? (
                      <img src={q.cover_image_url || q.games.cover_image_url} alt={q.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                        <Compass className="h-10 w-10 text-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge variant="outline" className={`capitalize ${difficultyColor[q.difficulty] ?? ""}`}>{q.difficulty}</Badge>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-medium text-foreground">{q.is_active ? "Active" : "Off"}</span>
                      <Switch checked={q.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: q.id, is_active: checked })} />
                    </div>
                  </div>
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-foreground line-clamp-1">{q.name}</h3>
                      <p className="text-sm text-muted-foreground">{q.games?.name ?? "No game"} · {typeLabels[q.challenge_type] ?? q.challenge_type}</p>
                    </div>
                    {q.description && <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>}
                    <div className={`grid ${showEnrollmentCounts ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-center`}>
                      {showEnrollmentCounts && (
                        <div className="bg-muted rounded-lg p-2">
                          <Users className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                          <p className="font-heading text-xs font-semibold text-foreground">{q.enrollments_count}</p>
                          <p className="text-[10px] text-muted-foreground">Enrolled</p>
                        </div>
                      )}
                      <div className="bg-muted rounded-lg p-2">
                        <Star className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                        <p className="font-heading text-xs font-semibold text-foreground">{q.points_first}</p>
                        <p className="text-[10px] text-muted-foreground">Quest Pts</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <Clock className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                        <p className="font-heading text-xs font-semibold text-foreground">{q.estimated_minutes ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground">Min</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => setEditQuest(q)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/quests/${q.id}`)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                      <Button variant="outline" size="sm" onClick={() => setPromoData(buildQuestPromo(q))}><Megaphone className="h-3.5 w-3.5 mr-1" /> Promo</Button>
                      <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:bg-destructive/10" onClick={() => handleDelete(q.id, q.name)} disabled={deleteMutation.isPending}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Quest to Review</Label>
            <Select value={reviewQuestId || ""} onValueChange={setReviewQuestId}>
              <SelectTrigger><SelectValue placeholder="Choose a quest..." /></SelectTrigger>
              <SelectContent>
                {quests.map((q: any) => (
                  <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reviewQuestId && reviewEnrollments.length === 0 && (
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

                  {enrollment.quest_evidence?.length > 0 && (
                    <div className="space-y-3">
                      {enrollment.quest_evidence.map((e: any) => {
                        const task = e.task_id ? taskMap[e.task_id] : null;
                        const evStatusColor = e.status === "approved"
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
                              <Badge className={`text-xs shrink-0 ${evStatusColor}`}>{e.status || "pending"}</Badge>
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
                      <Button size="sm" className="gap-1" onClick={() => updateStatusMutation.mutate({ enrollmentId: enrollment.id, status: "completed" })} disabled={updateStatusMutation.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve All & Complete
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateStatusMutation.mutate({ enrollmentId: enrollment.id, status: "rejected" })} disabled={updateStatusMutation.isPending}>
                        <XCircle className="h-3.5 w-3.5" /> Reject Enrollment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="chains" className="mt-4">
          <AdminChainsTab />
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!detailQuest} onOpenChange={(open) => !open && setDetailQuest(null)}>
        {detailQuest && (
          <DialogContent className="border-border/50 max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`capitalize ${difficultyColor[detailQuest.difficulty] ?? ""}`}>{detailQuest.difficulty}</Badge>
                <Badge variant="outline" className={detailQuest.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground border-border"}>
                  {detailQuest.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <DialogTitle className="font-display text-2xl">{detailQuest.name}</DialogTitle>
              <DialogDescription>{detailQuest.games?.name ?? "No game"} · {typeLabels[detailQuest.challenge_type] ?? detailQuest.challenge_type}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {detailQuest.description && <p className="text-sm text-muted-foreground">{detailQuest.description}</p>}

              <div className="grid grid-cols-2 gap-3">
                {[
                  ...(showEnrollmentCounts ? [{ icon: Users, label: "Enrolled", value: detailQuest.enrollments_count }] : []),
                  { icon: Clock, label: "Est. Time", value: detailQuest.estimated_minutes ? `${detailQuest.estimated_minutes} min` : "—" },
                  { icon: Star, label: "Quest Pts", value: detailQuest.points_first },
                  { icon: Shield, label: "Evidence Req.", value: detailQuest.requires_evidence ? "Yes" : "No" },
                  ...(detailQuest.start_date ? [{ icon: Calendar, label: "Start", value: format(new Date(detailQuest.start_date), "MMM d, yyyy") }] : []),
                  ...(detailQuest.end_date ? [{ icon: Calendar, label: "End", value: format(new Date(detailQuest.end_date), "MMM d, yyyy") }] : []),
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

              <div className="bg-muted rounded-lg p-4 flex items-center justify-between">
                <span className="font-heading text-sm text-foreground">Quest Points</span>
                <p className="font-heading text-lg font-bold text-primary">{detailQuest.points_first}</p>
              </div>

              <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                <Label className="text-sm">Active Status</Label>
                <Switch
                  checked={detailQuest.is_active}
                  onCheckedChange={(checked) => {
                    toggleMutation.mutate({ id: detailQuest.id, is_active: checked });
                    setDetailQuest({ ...detailQuest, is_active: checked });
                  }}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" className="w-full py-5" onClick={() => { setEditQuest(detailQuest); setDetailQuest(null); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit Quest
                </Button>
                <Button variant="outline" className="w-full py-5" onClick={() => { navigate(`/quests/${detailQuest.id}`); setDetailQuest(null); }}>
                  <Eye className="h-4 w-4 mr-2" /> View Quest
                </Button>
                <Button variant="outline" className="w-full py-5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(detailQuest.id, detailQuest.name)} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Quest
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <EditQuestDialog
        quest={editQuest}
        open={!!editQuest}
        onOpenChange={(open) => !open && setEditQuest(null)}
        invalidateQueryKey={[`${queryKeyPrefix}-quests`]}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>? This will also remove all enrollments, evidence, and task data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promo Editor */}
      {promoData && (
        <EventPromoEditorDialog
          open={!!promoData}
          onOpenChange={(o) => { if (!o) setPromoData(null); }}
          imageUrl={promoData.imageUrl}
          initialTexts={promoData.texts}
        />
      )}
    </div>
  );
};

export default AdminQuestsPanel;
