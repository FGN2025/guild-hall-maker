import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trophy, Trash2, LayoutGrid, List, Search, Calendar, Users, GitBranch, Settings,
  Gamepad2, FileText, Plus, Eye, Megaphone, Pencil, Star,
} from "lucide-react";
import { EventPromoEditorDialog, buildTournamentPromo } from "@/components/marketing/EventPromoEditor";
import type { PromoData } from "@/components/marketing/EventPromoEditor";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import CreateTournamentDialog from "@/components/tournaments/CreateTournamentDialog";
import PrizeDisplay from "@/components/tournaments/PrizeDisplay";
import AchievementBadgeDisplay from "@/components/shared/AchievementBadgeDisplay";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColor: Record<string, string> = {
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  open: "bg-primary/15 text-primary border-primary/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

const ALL_STATUSES = ["all", "open", "upcoming", "in_progress", "completed", "cancelled"];

const ModeratorTournaments = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailTournament, setDetailTournament] = useState<any | null>(null);
  const [promoData, setPromoData] = useState<PromoData | null>(null);

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["mod-tournaments"],
    queryFn: async () => {
      const { data: tourneys, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: registrations } = await supabase
        .from("tournament_registrations")
        .select("tournament_id");

      const { data: games } = await supabase
        .from("games")
        .select("name, cover_image_url");

      const gameCovers = new Map((games ?? []).map((g: any) => [g.name, g.cover_image_url]));
      const regCounts = new Map<string, number>();
      (registrations ?? []).forEach((r: any) => {
        regCounts.set(r.tournament_id, (regCounts.get(r.tournament_id) ?? 0) + 1);
      });

      return (tourneys ?? []).map((t: any) => ({
        ...t,
        registrations_count: regCounts.get(t.id) ?? 0,
        game_cover_url: gameCovers.get(t.game) ?? null,
      }));
    },
  });

  const filtered = useMemo(() => {
    return tournaments.filter((t: any) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.game.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tournaments, search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tournaments").insert({ ...data, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-tournaments"] });
      toast.success("Tournament created!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-tournaments"] });
      toast.success("Tournament deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase.from("tournaments").update({ is_featured: !current } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["featured-events"] });
      toast.success("Featured status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tournaments").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-tournaments"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDetailTournament(null);
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
          <Trophy className="h-8 w-8 text-primary" />
          Tournament Management
        </h1>
        <div className="flex items-center gap-2">
          <CreateTournamentDialog onCreate={(data) => createMutation.mutate(data)} isCreating={createMutation.isPending} />
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
          <Input placeholder="Search tournaments…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All Statuses" : s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No tournaments found.</p>
      ) : viewMode === "list" ? (
        /* ───── LIST VIEW ───── */
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetailTournament(t)}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.game}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor[t.status] ?? ""}>{t.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{isAdmin ? `${t.registrations_count}/${t.max_participants}` : `${t.max_participants} max`}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(t.start_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleFeaturedMutation.mutate({ id: t.id, current: !!t.is_featured })}>
                        <Star className={`h-4 w-4 ${t.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/tournaments/${t.id}/manage`)}>
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/tournaments/${t.id}`)}>
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setPromoData(buildTournamentPromo(t))}>
                        <Megaphone className="h-4 w-4 text-primary" />
                      </Button>
                      {(t.status === "in_progress" || t.status === "completed") && (
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/tournaments/${t.id}/bracket`)}>
                          <GitBranch className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(t.id, t.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
          {filtered.map((t: any) => (
            <Card
              key={t.id}
              className="overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] bg-card/70 backdrop-blur-sm border-border"
              onClick={() => setDetailTournament(t)}
            >
              {/* Hero */}
              <div className="relative h-36 bg-muted overflow-hidden">
                {(t.image_url || t.game_cover_url) ? (
                  <img src={t.image_url || t.game_cover_url!} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                    <span className="font-display text-lg text-foreground/60 uppercase tracking-widest">{t.game}</span>
                  </div>
                )}
                <Badge variant="outline" className={`absolute top-3 left-3 capitalize ${statusColor[t.status] ?? ""}`}>
                  {t.status.replace("_", " ")}
                </Badge>
                <button
                  className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                  onClick={(e) => { e.stopPropagation(); toggleFeaturedMutation.mutate({ id: t.id, current: !!t.is_featured }); }}
                >
                  <Star className={`h-4 w-4 ${t.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              </div>

              <CardContent className="p-5 flex flex-col gap-3">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground line-clamp-1">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.game}</p>
                </div>

                <div className="text-xs text-muted-foreground h-[2.5rem] overflow-y-auto whitespace-pre-line">
                  {t.description || "\u00A0"}
                </div>

                {t.achievement_id && (
                  <AchievementBadgeDisplay achievementId={t.achievement_id} compact />
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded-lg p-2">
                    <Calendar className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                    <p className="font-heading text-xs font-semibold text-foreground">{format(new Date(t.start_date), "MMM d")}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <Users className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                    <p className="font-heading text-xs font-semibold text-foreground">{isAdmin ? `${t.registrations_count}/${t.max_participants}` : `${t.max_participants} max`}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-heading text-xs font-semibold text-foreground">
                      <PrizeDisplay prizeType={(t as any).prize_type} prizePool={t.prize_pool} compact />
                    </div>
                    <Trophy className="h-3.5 w-3.5 text-primary mx-auto mt-0.5" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/tournaments/${t.id}/manage`)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/tournaments/${t.id}`)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPromoData(buildTournamentPromo(t))}>
                    <Megaphone className="h-3.5 w-3.5 mr-1" /> Promo
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost" size="sm"
                      className="ml-auto text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(t.id, t.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ───── DETAILS DIALOG ───── */}
      <Dialog open={!!detailTournament} onOpenChange={(open) => !open && setDetailTournament(null)}>
        {detailTournament && (
          <DialogContent className="border-border/50 max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`capitalize ${statusColor[detailTournament.status] ?? ""}`}>
                  {detailTournament.status.replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">{detailTournament.format?.replace("_", " ")}</span>
              </div>
              <DialogTitle className="font-display text-2xl">{detailTournament.name}</DialogTitle>
              <DialogDescription>{detailTournament.game}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {detailTournament.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{detailTournament.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Calendar, label: "Start Date", value: format(new Date(detailTournament.start_date), "MMM d, yyyy · h:mm a") },
                  { icon: Users, label: "Players", value: isAdmin ? `${detailTournament.registrations_count} / ${detailTournament.max_participants}` : `${detailTournament.max_participants} max` },
                  { icon: Trophy, label: "Prize Pool", value: detailTournament.prize_pool || "None" },
                  { icon: Gamepad2, label: "Entry Fee", value: detailTournament.entry_fee ? `$${detailTournament.entry_fee}` : "Free" },
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

              {detailTournament.rules && (
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-heading text-sm text-foreground">Rules</span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{detailTournament.rules}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full py-5"
                  onClick={() => { navigate(`/tournaments/${detailTournament.id}/manage`); setDetailTournament(null); }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit Tournament
                </Button>

                <Button
                  variant="outline"
                  className="w-full py-5"
                  onClick={() => { navigate(`/tournaments/${detailTournament.id}`); setDetailTournament(null); }}
                >
                  <Eye className="h-4 w-4 mr-2" /> View Tournament
                </Button>

                <Button
                  variant="outline"
                  className="w-full py-5"
                  onClick={() => { setPromoData(buildTournamentPromo(detailTournament)); setDetailTournament(null); }}
                >
                  <Megaphone className="h-4 w-4 mr-2" /> Create Promo
                </Button>

                {(detailTournament.status === "in_progress" || detailTournament.status === "completed") && (
                  <Button
                    variant="outline"
                    className="w-full py-5 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => { navigate(`/tournaments/${detailTournament.id}/bracket`); setDetailTournament(null); }}
                  >
                    <GitBranch className="h-4 w-4 mr-2" /> View Bracket
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    className="w-full py-5 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(detailTournament.id, detailTournament.name)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Tournament
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ───── PROMO EDITOR ───── */}
      <EventPromoEditorDialog open={!!promoData} onOpenChange={(open) => !open && setPromoData(null)} imageUrl={promoData?.imageUrl ?? ""} initialTexts={promoData?.texts ?? []} />

      {/* ───── DELETE CONFIRMATION ───── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>? This will also remove all registrations, match results, and bracket data. This action cannot be undone.
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


export default ModeratorTournaments;
