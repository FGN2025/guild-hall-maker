import { useState, useMemo } from "react";
import usePageTitle from "@/hooks/usePageTitle";
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
  Target, Trash2, LayoutGrid, List, Search, Calendar, Users, Clock, Star,
  Gamepad2, FileText, Eye, Shield, Plus, Pencil, ClipboardList, CheckCircle2, XCircle, Image as ImageIcon, Megaphone, Compass, RefreshCw, Cpu, Copy, GripVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import CreateChallengeDialog from "@/components/challenges/CreateChallengeDialog";
import { useCopyContent } from "@/hooks/useCopyContent";
import EditChallengeDialog from "@/components/challenges/EditChallengeDialog";
import { EventPromoEditorDialog, buildChallengePromo } from "@/components/marketing/EventPromoEditor";
import type { PromoData } from "@/components/marketing/EventPromoEditor";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

import AdminQuestsPanel from "@/components/quests/AdminQuestsPanel";
// ── Sortable row for DnD ──
const SortableChallengeRow = ({ challenge: c, dragEnabled, onDetail, onEdit, onDelete, onToggle, onToggleFeatured, onCopy, copying, deleting, navigate }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style} className="cursor-pointer" onClick={() => onDetail(c)}>
      {dragEnabled && (
        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
          <button className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
        </TableCell>
      )}
      <TableCell className="font-medium">{c.name}</TableCell>
      <TableCell className="text-muted-foreground">{c.games?.name ?? "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`capitalize ${difficultyColor[c.difficulty] ?? ""}`}>{c.difficulty}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{typeLabels[c.challenge_type] ?? c.challenge_type}</TableCell>
      <TableCell className="text-muted-foreground">{c.enrollments_count}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Switch checked={c.is_active} onCheckedChange={(checked: boolean) => onToggle(c.id, checked)} />
                <span className="text-xs text-muted-foreground">{c.is_active ? "Active" : "Inactive"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Toggle challenge visibility for players</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => onToggleFeatured(c.id, !!c.is_featured)}>
            <Star className={`h-4 w-4 ${c.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(c)}>
            <Pencil className="h-4 w-4 text-primary" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/challenges/${c.id}`)}>
            <Eye className="h-4 w-4 text-primary" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onCopy(c.id)} disabled={copying}>
            <Copy className="h-4 w-4 text-primary" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(c.id, c.name)} disabled={deleting}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const AdminChallenges = () => {
  usePageTitle("Challenge & Quest Management");
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
  const [resyncing, setResyncing] = useState<string | null>(null);
  const [promoData, setPromoData] = useState<PromoData | null>(null);
  const { copying, copyToQuest } = useCopyContent();
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => {
      const { data: challengeData, error } = await supabase
        .from("challenges")
        .select("*, games(name, slug, cover_image_url)")
        .order("display_order", { ascending: true });
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

  const dragEnabled = !search && difficultyFilter === "all" && statusFilter === "all";
  const challengeIds = useMemo(() => filtered.map((c: any) => c.id), [filtered]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      await Promise.all(items.map(item =>
        supabase.from("challenges").update({ display_order: item.display_order } as any).eq("id", item.id)
          .then(({ error }) => { if (error) throw error; })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-challenges"] }),
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filtered.findIndex((c: any) => c.id === active.id);
    const newIndex = filtered.findIndex((c: any) => c.id === over.id);
    const reordered = arrayMove(filtered, oldIndex, newIndex);
    const updatedItems = reordered.map((c: any, i: number) => ({ ...c, display_order: i }));

    // Cancel in-flight refetches so they don't overwrite optimistic update
    await queryClient.cancelQueries({ queryKey: ["admin-challenges"] });

    // Snapshot for rollback
    const previous = queryClient.getQueryData(["admin-challenges"]);

    // Optimistic cache update
    queryClient.setQueryData(["admin-challenges"], (old: any[] | undefined) => {
      if (!old) return updatedItems;
      const updateMap = new Map(updatedItems.map((item: any) => [item.id, item.display_order]));
      return old.map((c: any) => updateMap.has(c.id) ? { ...c, display_order: updateMap.get(c.id) } : c)
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
    });

    // Persist to DB with rollback on error
    reorderMutation.mutate(
      updatedItems.map((c: any) => ({ id: c.id, display_order: c.display_order })),
      { onError: () => {
          queryClient.setQueryData(["admin-challenges"], previous);
          toast.error("Reorder failed");
        }
      }
    );
  };

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

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase.from("challenges").update({ is_featured: !current } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["featured-events"] });
      toast.success("Featured status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: string }) => {
      // 1. Get enrollment details
      const { data: enrollment, error: enrollErr } = await supabase
        .from("challenge_enrollments")
        .select("user_id, challenge_id")
        .eq("id", enrollmentId)
        .single();
      if (enrollErr) throw enrollErr;

      // 2. Update status
      const { error } = await supabase.from("challenge_enrollments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      if (error) throw error;

      // 3. If completing, award points
      if (status === "completed" && enrollment && user) {
        const { data: challenge } = await supabase
          .from("challenges")
          .select("name, points_reward, game_id, games(name)")
          .eq("id", enrollment.challenge_id)
          .single();

        const points = (challenge as any)?.points_reward ?? 0;
        const challengeName = (challenge as any)?.name ?? "Challenge";

        // Record completion
        await supabase.from("challenge_completions").insert({
          user_id: enrollment.user_id,
          challenge_id: enrollment.challenge_id,
          awarded_points: points,
          verified_by: user.id,
        });

        // Sync to FGN Academy and surface result
        supabase.functions.invoke("sync-to-academy", {
          body: {
            user_id: enrollment.user_id,
            challenge_id: enrollment.challenge_id,
            awarded_points: points,
          },
        }).then(({ data }) => {
          if (data?.success) {
            toast.success("Progress synced to FGN Academy");
          } else if (data?.user_not_found) {
            toast.info("Player not yet registered on FGN Academy — sync skipped");
          }
        }).catch((err: any) => console.warn("Academy sync failed (non-blocking):", err));

        // Notify the player
        await supabase.from("notifications").insert({
          user_id: enrollment.user_id,
          title: "Challenge Approved!",
          message: `Your submission for "${challengeName}" has been approved! You earned ${points} points.`,
          type: "challenge",
          link: `/challenges/${enrollment.challenge_id}`,
        });

        // Credit season score
        if (points > 0) {
          await supabase.functions.invoke("award-season-points", {
            body: {
              winner_id: enrollment.user_id,
              points_winner: points,
              game: (challenge as any)?.games?.name,
            },
          });
        }
      }
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
          Challenge & Quest Management
        </h1>
      </div>

      {/* Outer Tabs: Challenges | Quests */}
      <Tabs defaultValue="challenges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="challenges" className="gap-1.5"><Target className="h-4 w-4" /> Challenges</TabsTrigger>
          <TabsTrigger value="quests" className="gap-1.5"><Compass className="h-4 w-4" /> Quests</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges">
          <div className="flex items-center justify-end gap-3 mb-4">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/challenges/generate")}>
              <Cpu className="h-4 w-4" /> Generate with Agent
            </Button>
            <CreateChallengeDialog
              invalidateQueryKey={["admin-challenges"]}
              trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> New Challenge</Button>}
            />
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {dragEnabled && <TableHead className="w-10" />}
                    <TableHead>Name</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext items={challengeIds} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {filtered.map((c: any) => (
                    <SortableChallengeRow
                      key={c.id}
                      challenge={c}
                      dragEnabled={dragEnabled}
                      onDetail={setDetailChallenge}
                      onEdit={setEditChallenge}
                      onDelete={handleDelete}
                      onToggle={(id, checked) => toggleMutation.mutate({ id, is_active: checked })}
                      onToggleFeatured={(id, current) => toggleFeaturedMutation.mutate({ id, current })}
                      onCopy={copyToQuest}
                      copying={copying}
                      deleting={deleteMutation.isPending}
                      navigate={navigate}
                    />
                  ))}
                </TableBody>
                </SortableContext>
              </Table>
              </DndContext>
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
                    <div className="absolute top-3 right-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                        onClick={() => toggleFeaturedMutation.mutate({ id: c.id, current: !!c.is_featured })}
                      >
                        <Star className={`h-4 w-4 ${c.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                      <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="text-[10px] font-medium text-foreground">{c.is_active ? "Active" : "Off"}</span>
                        <Switch checked={c.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })} />
                      </div>
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
                        <p className="text-[10px] text-muted-foreground">Pts</p>
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
                      <Button variant="outline" size="sm" onClick={() => copyToQuest(c.id)} disabled={copying}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> {copying ? "…" : "→ Quest"}
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

                  {enrollment.status === "completed" && (
                    <div className="flex gap-2 border-t border-border pt-3">
                      <Button
                        size="sm" variant="outline" className="gap-1"
                        disabled={resyncing === enrollment.id}
                        onClick={async () => {
                          setResyncing(enrollment.id);
                          try {
                            const { data, error } = await supabase.functions.invoke("sync-to-academy", {
                              body: {
                                user_id: enrollment.user_id,
                                challenge_id: enrollment.challenge_id,
                                awarded_points: 0,
                              },
                            });
                            if (error) throw error;
                            if (data?.success) {
                              toast.success("Academy sync completed");
                            } else {
                              toast.error(data?.message || "Sync failed");
                            }
                          } catch (err: any) {
                            toast.error("Sync error: " + (err.message || "Unknown"));
                          } finally {
                            setResyncing(null);
                          }
                        }}
                      >
                        {resyncing === enrollment.id ? (
                          <div className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Retry Academy Sync
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
                  { icon: Star, label: "Points", value: detailChallenge.points_first },
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
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" className="w-full py-5" onClick={() => { setEditChallenge(detailChallenge); setDetailChallenge(null); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit Challenge
                </Button>
                <Button variant="outline" className="w-full py-5" onClick={() => { navigate(`/challenges/${detailChallenge.id}`); setDetailChallenge(null); }}>
                  <Eye className="h-4 w-4 mr-2" /> View Challenge
                </Button>
                <Button variant="outline" className="w-full py-5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(detailChallenge.id, detailChallenge.name)} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Challenge
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <EditChallengeDialog
        challenge={editChallenge}
        open={!!editChallenge}
        onOpenChange={(open) => !open && setEditChallenge(null)}
        invalidateQueryKey={["admin-challenges"]}
      />

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
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {promoData && (
        <EventPromoEditorDialog
          open={!!promoData}
          onOpenChange={(o) => { if (!o) setPromoData(null); }}
          imageUrl={promoData.imageUrl}
          initialTexts={promoData.texts}
        />
      )}

        </TabsContent>

        <TabsContent value="quests">
          <AdminQuestsPanel queryKeyPrefix="admin" showEnrollmentCounts />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminChallenges;
