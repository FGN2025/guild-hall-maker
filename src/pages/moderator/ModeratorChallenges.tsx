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
import { Target, Plus, Users, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ModeratorChallenges = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", challenge_type: "one_time", start_date: "", end_date: "", points_first: "10", points_second: "5", points_third: "3", points_participation: "2" });

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["mod-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: completionCounts = {} } = useQuery({
    queryKey: ["mod-challenge-completion-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenge_completions").select("challenge_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((c: any) => { counts[c.challenge_id] = (counts[c.challenge_id] || 0) + 1; });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("challenges").insert({
        name: form.name,
        description: form.description || null,
        points_reward: parseInt(form.points_first) || 10,
        challenge_type: form.challenge_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        created_by: user.id,
        points_first: parseInt(form.points_first) || 10,
        points_second: parseInt(form.points_second) || 5,
        points_third: parseInt(form.points_third) || 3,
        points_participation: parseInt(form.points_participation) || 2,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-challenges"] });
      toast.success("Challenge created!");
      setCreateOpen(false);
      setForm({ name: "", description: "", challenge_type: "one_time", start_date: "", end_date: "", points_first: "10", points_second: "5", points_third: "3", points_participation: "2" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("challenges").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-challenges"] });
      toast.success("Updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          Challenges
        </h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Challenge</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create Challenge</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Challenge name..." />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What players need to do..." disabled={enhancing} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={enhancing || !form.name.trim()}
                  onClick={async () => {
                    setEnhancing(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('enhance-challenge-description', {
                        body: { name: form.name, description: form.description, challenge_type: form.challenge_type },
                      });
                      if (error) throw error;
                      if (data?.error) throw new Error(data.error);
                      if (data?.enhanced_description) {
                        setForm(f => ({ ...f, description: data.enhanced_description }));
                        toast.success("Description enhanced!");
                      }
                    } catch (e: any) {
                      toast.error(e.message || "Failed to enhance description");
                    } finally {
                      setEnhancing(false);
                    }
                  }}
                >
                  {enhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {enhancing ? "Enhancing..." : "Enhance with AI"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={form.challenge_type} onChange={(e) => setForm({ ...form, challenge_type: e.target.value })} placeholder="one_time, daily, weekly" />
              </div>
              <div className="space-y-2">
                <Label>Season Points</Label>
                <p className="text-xs text-muted-foreground">Points awarded based on completion order</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">1st</Label>
                    <Input type="number" min={0} value={form.points_first} onChange={(e) => setForm({ ...form, points_first: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">2nd</Label>
                    <Input type="number" min={0} value={form.points_second} onChange={(e) => setForm({ ...form, points_second: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">3rd</Label>
                    <Input type="number" min={0} value={form.points_third} onChange={(e) => setForm({ ...form, points_third: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Others</Label>
                    <Input type="number" min={0} value={form.points_participation} onChange={(e) => setForm({ ...form, points_participation: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name.trim()} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Challenge"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : challenges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-body">No challenges created yet. Click "New Challenge" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                 <TableHead>Points (1st/2nd/3rd/P)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Completions</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">{c.points_first ?? c.points_reward}/{c.points_second ?? 0}/{c.points_third ?? 0}/{c.points_participation ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.challenge_type}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {(completionCounts as any)[c.id] || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"}
                    {" → "}
                    {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ModeratorChallenges;
