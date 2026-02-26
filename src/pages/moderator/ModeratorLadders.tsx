import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Plus, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const ModeratorLadders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLadder, setSelectedLadder] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: ladders = [], isLoading } = useQuery({
    queryKey: ["mod-ladders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ladders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["mod-ladder-entries", selectedLadder],
    enabled: !!selectedLadder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ladder_entries")
        .select("*")
        .eq("ladder_id", selectedLadder!)
        .order("rating", { ascending: false });
      if (error) throw error;

      const userIds = (data ?? []).map((e: any) => e.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, gamer_tag").in("user_id", userIds)
        : { data: [] };

      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.gamer_tag || p.display_name || "Unknown"]));

      return (data ?? []).map((e: any, i: number) => ({
        ...e,
        player_name: nameMap.get(e.user_id) ?? "Unknown",
        display_rank: i + 1,
      }));
    },
  });

  const { data: entryCounts = {} } = useQuery({
    queryKey: ["mod-ladder-entry-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ladder_entries").select("ladder_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((e: any) => { counts[e.ladder_id] = (counts[e.ladder_id] || 0) + 1; });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("ladders").insert({
        name: form.name,
        description: form.description || null,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-ladders"] });
      queryClient.invalidateQueries({ queryKey: ["mod-ladder-entry-counts"] });
      toast.success("Ladder created!");
      setCreateOpen(false);
      setForm({ name: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ladders").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-ladders"] });
      toast.success("Updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRatingMutation = useMutation({
    mutationFn: async ({ entryId, rating }: { entryId: string; rating: number }) => {
      const { error } = await supabase.from("ladder_entries").update({ rating } as any).eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-ladder-entries", selectedLadder] });
      toast.success("Rating updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          Ladders
        </h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Ladder</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create Ladder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ladder name..." />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ladder description..." />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name.trim()} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Ladder"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ladder list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : ladders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No ladders yet.</p>
              </CardContent>
            </Card>
          ) : (
            ladders.map((l: any) => (
              <Card
                key={l.id}
                className={`cursor-pointer transition-colors ${selectedLadder === l.id ? "border-primary" : "hover:border-primary/30"}`}
                onClick={() => setSelectedLadder(l.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{l.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Users className="h-3 w-3" /> {(entryCounts as any)[l.id] || 0}
                      </Badge>
                      <Badge className={l.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}>
                        {l.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={l.is_active}
                      onCheckedChange={(checked) => { toggleMutation.mutate({ id: l.id, is_active: checked }); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Ladder entries */}
        <div className="lg:col-span-2">
          {!selectedLadder ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Select a ladder to view rankings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>W/L</TableHead>
                    <TableHead className="text-right">Adjust</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No players in this ladder yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono font-bold text-primary">{e.display_rank}</TableCell>
                        <TableCell className="font-medium">{e.player_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">{e.rating}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.wins}W / {e.losses}L</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => updateRatingMutation.mutate({ entryId: e.id, rating: e.rating + 25 })}>
                              +25
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateRatingMutation.mutate({ entryId: e.id, rating: Math.max(0, e.rating - 25) })}>
                              -25
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModeratorLadders;
