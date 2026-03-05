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
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Plus, Users, Sparkles, Loader2, ClipboardList, Eye, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const ModeratorChallenges = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [reviewChallengeId, setReviewChallengeId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", challenge_type: "one_time",
    start_date: "", end_date: "",
    points_first: "10", points_second: "5", points_third: "3", points_participation: "2",
    difficulty: "beginner", estimated_minutes: "", requires_evidence: true,
    cover_image_url: "",
    tasks: [] as { title: string; description: string }[],
  });

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["mod-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenges").select("*, games(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: games = [] } = useQuery({
    queryKey: ["mod-games-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selectedGameId, setSelectedGameId] = useState<string>("");

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["mod-enrollment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenge_enrollments").select("challenge_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((e: any) => { counts[e.challenge_id] = (counts[e.challenge_id] || 0) + 1; });
      return counts;
    },
  });

  // Enrollments for review
  const { data: reviewEnrollments = [] } = useQuery({
    queryKey: ["mod-review-enrollments", reviewChallengeId],
    enabled: !!reviewChallengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_enrollments")
        .select("*, challenge_evidence(*)")
        .eq("challenge_id", reviewChallengeId!)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      // Fetch profile display_names
      const userIds = (data ?? []).map((e: any) => e.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.display_name; });
      return (data ?? []).map((e: any) => ({ ...e, display_name: nameMap[e.user_id] || "Unknown" }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data: challenge, error } = await supabase.from("challenges").insert({
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
        difficulty: form.difficulty,
        estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null,
        requires_evidence: form.requires_evidence,
        cover_image_url: form.cover_image_url || null,
        game_id: selectedGameId || null,
      } as any).select().single();
      if (error) throw error;

      // Create tasks
      if (form.tasks.length > 0 && challenge) {
        const tasks = form.tasks.map((t, i) => ({
          challenge_id: challenge.id,
          title: t.title,
          description: t.description || null,
          display_order: i,
        }));
        const { error: taskError } = await supabase.from("challenge_tasks").insert(tasks);
        if (taskError) throw taskError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-challenges"] });
      toast.success("Challenge created!");
      setCreateOpen(false);
      setForm({
        name: "", description: "", challenge_type: "one_time",
        start_date: "", end_date: "",
        points_first: "10", points_second: "5", points_third: "3", points_participation: "2",
        difficulty: "beginner", estimated_minutes: "", requires_evidence: true,
        cover_image_url: "", tasks: [],
      });
      setSelectedGameId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("challenges").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mod-challenges"] }); toast.success("Updated!"); },
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
      queryClient.invalidateQueries({ queryKey: ["mod-review-enrollments"] });
      toast.success("Status updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTask = () => setForm(f => ({ ...f, tasks: [...f.tasks, { title: "", description: "" }] }));
  const removeTask = (i: number) => setForm(f => ({ ...f, tasks: f.tasks.filter((_, idx) => idx !== i) }));
  const updateTask = (i: number, field: string, val: string) =>
    setForm(f => ({ ...f, tasks: f.tasks.map((t, idx) => idx === i ? { ...t, [field]: val } : t) }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          Challenges
        </h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Challenge</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Create Challenge</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Challenge name..." />
                </div>
                <div className="space-y-2">
                  <Label>Game</Label>
                  <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                    <SelectTrigger><SelectValue placeholder="Select game..." /></SelectTrigger>
                    <SelectContent>
                      {games.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What players need to do..." disabled={enhancing} />
                <Button
                  type="button" variant="outline" size="sm" className="gap-1.5"
                  disabled={enhancing || !form.name.trim()}
                  onClick={async () => {
                    setEnhancing(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('enhance-challenge-description', {
                        body: { name: form.name, description: form.description, challenge_type: form.challenge_type },
                      });
                      if (error) throw error;
                      if (data?.enhanced_description) {
                        setForm(f => ({ ...f, description: data.enhanced_description }));
                        toast.success("Description enhanced!");
                      }
                    } catch (e: any) { toast.error(e.message || "Failed"); }
                    finally { setEnhancing(false); }
                  }}
                >
                  {enhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {enhancing ? "Enhancing..." : "Enhance with AI"}
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Est. Minutes</Label>
                  <Input type="number" min={1} value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} placeholder="e.g. 60" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.challenge_type} onValueChange={(v) => setForm({ ...form, challenge_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-Time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cover Image URL</Label>
                <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.requires_evidence} onCheckedChange={(v) => setForm({ ...form, requires_evidence: v })} />
                <Label>Requires evidence upload</Label>
              </div>

              <div className="space-y-2">
                <Label>Season Points</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: "points_first", label: "1st" },
                    { key: "points_second", label: "2nd" },
                    { key: "points_third", label: "3rd" },
                    { key: "points_participation", label: "Others" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input type="number" min={0} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    </div>
                  ))}
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

              {/* Task Builder */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Tasks / Objectives</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTask} className="gap-1">
                    <Plus className="h-3 w-3" /> Add Task
                  </Button>
                </div>
                {form.tasks.map((t, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={t.title}
                        onChange={(e) => updateTask(i, "title", e.target.value)}
                        placeholder={`Task ${i + 1} title...`}
                      />
                      <Input
                        value={t.description}
                        onChange={(e) => updateTask(i, "description", e.target.value)}
                        placeholder="Optional description..."
                        className="text-sm"
                      />
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(i)}>✕</Button>
                  </div>
                ))}
                {form.tasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tasks added. Players can submit general evidence.</p>
                )}
              </div>

              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name.trim()} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Challenge"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="challenges">
        <TabsList>
          <TabsTrigger value="challenges" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Challenges</TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5"><Eye className="h-4 w-4" /> Evidence Review</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : challenges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">No challenges created yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Enrolled</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">{c.games?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{c.difficulty || "beginner"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">{c.points_first}/{c.points_second}/{c.points_third}/{c.points_participation}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {(enrollmentCounts as any)[c.id] || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch checked={c.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, is_active: checked })} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

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

          {reviewEnrollments.map((enrollment: any) => (
            <Card key={enrollment.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{enrollment.display_name}</p>
                    <p className="text-xs text-muted-foreground">Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{enrollment.status}</Badge>
                </div>

                {/* Evidence */}
                {enrollment.challenge_evidence?.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {enrollment.challenge_evidence.map((e: any) => (
                      <a key={e.id} href={e.file_url} target="_blank" rel="noopener noreferrer" className="group">
                        <div className="rounded border border-border overflow-hidden aspect-video bg-muted">
                          {e.file_type === "image" ? (
                            <img src={e.file_url} alt="Evidence" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                          )}
                        </div>
                        {e.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{e.notes}</p>}
                      </a>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {enrollment.status === "submitted" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm" className="gap-1"
                      onClick={() => updateStatusMutation.mutate({ enrollmentId: enrollment.id, status: "completed" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm" variant="destructive" className="gap-1"
                      onClick={() => updateStatusMutation.mutate({ enrollmentId: enrollment.id, status: "rejected" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModeratorChallenges;
