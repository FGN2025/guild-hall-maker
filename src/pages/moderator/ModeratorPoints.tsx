import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Search, Plus, Minus, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const ModeratorPoints = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [pointsChange, setPointsChange] = useState("");
  const [reason, setReason] = useState("");
  const [adjustType, setAdjustType] = useState<"award" | "deduct">("award");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Get active seasons (multiple per game)
  const { data: activeSeasons = [] } = useQuery({
    queryKey: ["mod-active-seasons"],
    queryFn: async () => {
      const { data } = await supabase.from("seasons").select("*").eq("status", "active").order("name");
      return data ?? [];
    },
  });

  const activeSeason = selectedSeasonId
    ? activeSeasons.find((s: any) => s.id === selectedSeasonId)
    : activeSeasons[0] ?? null;

  // Get all players with their season scores
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["mod-players-points", search, activeSeason?.id],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("display_name");
      if (search) {
        query = query.or(`display_name.ilike.%${search}%,gamer_tag.ilike.%${search}%`);
      }
      const { data: profiles, error } = await query;
      if (error) throw error;

      if (!activeSeason) return (profiles ?? []).map((p: any) => ({ ...p, points: 0, points_available: 0, wins: 0 }));

      const { data: scores } = await supabase
        .from("season_scores")
        .select("*")
        .eq("season_id", activeSeason.id);

      const scoreMap = new Map((scores ?? []).map((s: any) => [s.user_id, s]));

      return (profiles ?? []).map((p: any) => ({
        ...p,
        points: scoreMap.get(p.user_id)?.points ?? 0,
        points_available: scoreMap.get(p.user_id)?.points_available ?? 0,
        wins: scoreMap.get(p.user_id)?.wins ?? 0,
        score_id: scoreMap.get(p.user_id)?.id ?? null,
      }));
    },
  });

  // Get audit trail
  const { data: adjustments = [] } = useQuery({
    queryKey: ["mod-point-adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_adjustments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const userIds = [...new Set((data ?? []).flatMap((a: any) => [a.user_id, a.adjusted_by]))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds)
        : { data: [] };

      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name ?? "Unknown"]));

      return (data ?? []).map((a: any) => ({
        ...a,
        player_name: nameMap.get(a.user_id) ?? "Unknown",
        moderator_name: nameMap.get(a.adjusted_by) ?? "Unknown",
      }));
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedPlayer || !activeSeason) throw new Error("Missing data");
      const change = parseInt(pointsChange);
      if (isNaN(change) || change <= 0) throw new Error("Invalid points value");

      const actualChange = adjustType === "deduct" ? -change : change;
      const player = players.find((p: any) => p.user_id === selectedPlayer);
      if (!player) throw new Error("Player not found");

      // Upsert season score (both total earned and available)
      if (player.score_id) {
        const newPoints = Math.max(0, player.points + actualChange);
        const newAvailable = Math.max(0, player.points_available + actualChange);
        const { error } = await supabase
          .from("season_scores")
          .update({ points: newPoints, points_available: newAvailable } as any)
          .eq("id", player.score_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("season_scores").insert({
          season_id: activeSeason.id,
          user_id: selectedPlayer,
          points: Math.max(0, actualChange),
          points_available: Math.max(0, actualChange),
        } as any);
        if (error) throw error;
      }

      // Record audit trail
      const { error: auditError } = await supabase.from("point_adjustments").insert({
        user_id: selectedPlayer,
        adjusted_by: user.id,
        season_id: activeSeason.id,
        points_change: actualChange,
        reason: reason.trim(),
        adjustment_type: adjustType === "award" ? "manual_award" : "manual_deduct",
      } as any);
      if (auditError) throw auditError;
    },
    onSuccess: () => {
      toast.success(`Points ${adjustType === "award" ? "awarded" : "deducted"} successfully!`);
      queryClient.invalidateQueries({ queryKey: ["mod-players-points"] });
      queryClient.invalidateQueries({ queryKey: ["mod-point-adjustments"] });
      setDialogOpen(false);
      setPointsChange("");
      setReason("");
      setSelectedPlayer(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3 mb-2">
        <Star className="h-8 w-8 text-primary" />
        Points Management
      </h1>
      {activeSeasons.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-muted-foreground font-heading">Season:</span>
          <Select value={activeSeason?.id ?? ""} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {activeSeasons.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <p className="text-muted-foreground font-body mb-8">
        {activeSeason ? `Active Season: ${activeSeason.name}` : "No active season found."}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player list */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Total Earned</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Wins</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.display_name ?? "Unknown"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{p.points}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{p.points_available}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.wins}</TableCell>
                      <TableCell className="text-right">
                        <Dialog open={dialogOpen && selectedPlayer === p.user_id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (open) setSelectedPlayer(p.user_id);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1" disabled={!activeSeason}>
                              <Star className="h-3 w-3" /> Adjust
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-display">Adjust Points — {p.display_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-2">
                              <div className="flex gap-2">
                                <Button
                                  variant={adjustType === "award" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setAdjustType("award")}
                                  className="gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Award
                                </Button>
                                <Button
                                  variant={adjustType === "deduct" ? "destructive" : "outline"}
                                  size="sm"
                                  onClick={() => setAdjustType("deduct")}
                                  className="gap-1"
                                >
                                  <Minus className="h-3 w-3" /> Deduct
                                </Button>
                              </div>
                              <div className="space-y-2">
                                <Label>Points</Label>
                                <Input type="number" min={1} value={pointsChange} onChange={(e) => setPointsChange(e.target.value)} placeholder="Enter amount..." />
                              </div>
                              <div className="space-y-2">
                                <Label>Reason *</Label>
                                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for adjustment (required for audit trail)..." required />
                              </div>
                              <Button
                                onClick={() => adjustMutation.mutate()}
                                disabled={adjustMutation.isPending || !pointsChange || !reason.trim()}
                                className="w-full"
                              >
                                {adjustMutation.isPending ? "Processing..." : `${adjustType === "award" ? "Award" : "Deduct"} ${pointsChange || "0"} Points`}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Audit trail */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {adjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No adjustments yet.</p>
              ) : (
                adjustments.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{a.player_name}</span>
                      <Badge className={a.points_change > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {a.points_change > 0 ? "+" : ""}{a.points_change}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      by {a.moderator_name} · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModeratorPoints;
