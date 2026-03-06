import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Target, Trash2, LayoutGrid, List, Search, Calendar, Users, Clock, Star,
  Gamepad2, FileText, Eye, Shield, Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import CreateChallengeDialog from "@/components/challenges/CreateChallengeDialog";
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailChallenge, setDetailChallenge] = useState<any | null>(null);

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
          Challenge Oversight
        </h1>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
                <TableHead>Status</TableHead>
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
                  <TableCell>
                    <Badge variant="outline" className={c.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground border-border"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
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
                  <Badge variant="outline" className={c.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground border-border"}>
                    {c.is_active ? "Active" : "Inactive"}
                  </Badge>
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
                  <Button variant="outline" size="sm" onClick={() => navigate(`/challenges/${c.id}`)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
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

              {/* Admin action buttons */}
              <div className="flex flex-col gap-2 pt-2">
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
