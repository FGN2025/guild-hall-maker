import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Upload, ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import AchievementPicker from "@/components/shared/AchievementPicker";

interface CreateQuestDialogProps {
  invalidateQueryKey: string[];
  trigger: React.ReactNode;
}

const defaultForm = {
  name: "", description: "", challenge_type: "one_time",
  start_date: "", end_date: "",
  points_first: "10",
  difficulty: "beginner", estimated_minutes: "", requires_evidence: true,
  cover_image_url: "",
  story_intro: "", story_outro: "", xp_reward: "0",
  tasks: [] as { title: string; description: string }[],
};

const CreateQuestDialog = ({ invalidateQueryKey, trigger }: CreateQuestDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getPreset } = useImageLimits();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedChainId, setSelectedChainId] = useState("");
  const [chainOrder, setChainOrder] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [enhancingDesc, setEnhancingDesc] = useState(false);

  const enhanceDescription = async () => {
    if (!form.name.trim()) { toast.error("Enter a quest name first"); return; }
    setEnhancingDesc(true);
    try {
      const gameName = games.find((g: any) => g.id === selectedGameId)?.name || "";
      const { data, error } = await supabase.functions.invoke("enhance-challenge-description", {
        body: {
          name: form.name, description: form.description, challenge_type: form.challenge_type,
          game_name: gameName, difficulty: form.difficulty,
          estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
          tasks: form.tasks.map(t => t.title).filter(Boolean),
          cover_image_url: imagePreview || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.enhanced_description) {
        setForm(f => ({ ...f, description: data.enhanced_description }));
        toast.success("Description enhanced");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to enhance description");
    } finally {
      setEnhancingDesc(false);
    }
  };

  const enhanceNarrative = async (field: "intro" | "outro") => {
    if (!form.name.trim()) { toast.error("Enter a quest name first"); return; }
    setEnhancingField(field);
    try {
      const gameName = games.find((g: any) => g.id === selectedGameId)?.name || "";
      const { data, error } = await supabase.functions.invoke("enhance-quest-narrative", {
        body: {
          name: form.name, description: form.description, game_name: gameName,
          difficulty: form.difficulty, challenge_type: form.challenge_type,
          field, draft: field === "intro" ? form.story_intro : form.story_outro,
          game_id: selectedGameId || null,
          tasks: form.tasks.map(t => t.title).filter(Boolean),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.enhanced_text) {
        setForm(f => ({ ...f, [field === "intro" ? "story_intro" : "story_outro"]: data.enhanced_text }));
        toast.success("Narrative generated");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to enhance narrative");
    } finally {
      setEnhancingField(null);
    }
  };

  const { data: games = [] } = useQuery({
    queryKey: ["create-quest-games"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: questChains = [] } = useQuery({
    queryKey: ["create-quest-chains"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quest_chains").select("id, name").order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = await validateAndToast(file, getPreset("cardCover"));
    if (!valid) { e.target.value = ""; return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let coverUrl = form.cover_image_url || null;

      if (imageFile) {
        setUploadingImage(true);
        const ext = imageFile.name.split(".").pop() ?? "png";
        const filePath = `quests/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("app-media").upload(filePath, imageFile, { contentType: imageFile.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(filePath);
          coverUrl = urlData.publicUrl;
          await supabase.from("media_library").insert({
            user_id: user.id, file_name: imageFile.name, file_path: filePath,
            file_type: "image", mime_type: imageFile.type, file_size: imageFile.size,
            url: urlData.publicUrl, category: "general", tags: ["quest", form.name.trim()],
          } as any);
        }
        setUploadingImage(false);
      } else if (imagePreview) {
        coverUrl = imagePreview;
      }

      const { data: quest, error } = await supabase.from("quests").insert({
        name: form.name,
        description: form.description || null,
        points_reward: parseInt(form.points_first) || 10,
        challenge_type: form.challenge_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        created_by: user.id,
        points_first: parseInt(form.points_first) || 10,
        points_second: 0,
        points_third: 0,
        points_participation: 0,
        difficulty: form.difficulty,
        estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null,
        requires_evidence: form.requires_evidence,
        cover_image_url: coverUrl,
        game_id: selectedGameId || null,
        chain_id: selectedChainId || null,
        chain_order: selectedChainId ? chainOrder : 0,
        story_intro: form.story_intro || null,
        story_outro: form.story_outro || null,
        xp_reward: parseInt(form.xp_reward) || 0,
      } as any).select().single();
      if (error) throw error;

      if (form.tasks.length > 0 && quest) {
        const tasks = form.tasks.map((t, i) => ({
          quest_id: quest.id,
          title: t.title,
          description: t.description || null,
          display_order: i,
        }));
        const { error: taskError } = await supabase.from("quest_tasks").insert(tasks);
        if (taskError) throw taskError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      toast.success("Quest created!");
      setOpen(false);
      setForm({ ...defaultForm });
      setSelectedGameId("");
      setSelectedChainId("");
      setChainOrder(0);
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTask = () => setForm(f => ({ ...f, tasks: [...f.tasks, { title: "", description: "" }] }));
  const removeTask = (i: number) => setForm(f => ({ ...f, tasks: f.tasks.filter((_, idx) => idx !== i) }));
  const updateTask = (i: number, field: string, val: string) =>
    setForm(f => ({ ...f, tasks: f.tasks.map((t, idx) => idx === i ? { ...t, [field]: val } : t) }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create Quest</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Quest name..." />
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
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs text-primary" onClick={enhanceDescription} disabled={enhancingDesc || !form.name.trim()}>
                {enhancingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Enhance
              </Button>
            </div>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What players need to do..." disabled={enhancingDesc} />
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
            <Label>Cover Image</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card text-sm font-heading text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <Upload className="h-4 w-4" />
                {imageFile ? imageFile.name : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <Button
                type="button" variant="outline" size="sm"
                className="font-heading gap-2 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setMediaPickerOpen(true)}
              >
                <ImageIcon className="h-4 w-4" /> Media Library
              </Button>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="h-10 w-10 rounded object-cover border border-border" />
              )}
            </div>
            <MediaPickerDialog
              open={mediaPickerOpen}
              onOpenChange={setMediaPickerOpen}
              onSelect={(url) => { setImageFile(null); setImagePreview(url); }}
            />
          </div>

          {/* Chain & Story Fields */}
          <div className="space-y-4 border-t border-border pt-4">
            <Label className="text-base">Quest Chain & Story</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quest Chain</Label>
                <Select value={selectedChainId} onValueChange={setSelectedChainId}>
                  <SelectTrigger><SelectValue placeholder="No chain" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No chain</SelectItem>
                    {questChains.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chain Order</Label>
                <Input type="number" min={0} value={chainOrder} onChange={(e) => setChainOrder(Number(e.target.value))} disabled={!selectedChainId || selectedChainId === "none"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>XP Reward</Label>
              <Input type="number" min={0} value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: e.target.value })} placeholder="0" />
              <p className="text-xs text-muted-foreground">Quest XP (separate from season points)</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Story Intro</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary" onClick={() => enhanceNarrative("intro")} disabled={enhancingField === "intro" || !form.name.trim()}>
                  {enhancingField === "intro" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Enhance
                </Button>
              </div>
              <Textarea value={form.story_intro} onChange={(e) => setForm({ ...form, story_intro: e.target.value })} placeholder="Narrative shown when player starts this quest..." rows={2} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Story Outro</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary" onClick={() => enhanceNarrative("outro")} disabled={enhancingField === "outro" || !form.name.trim()}>
                  {enhancingField === "outro" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Enhance
                </Button>
              </div>
              <Textarea value={form.story_outro} onChange={(e) => setForm({ ...form, story_outro: e.target.value })} placeholder="Narrative shown on completion..." rows={2} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.requires_evidence} onCheckedChange={(v) => setForm({ ...form, requires_evidence: v })} />
            <Label>Requires evidence upload</Label>
          </div>

          <div className="space-y-2">
            <Label>Quest Points</Label>
            <Input type="number" min={0} value={form.points_first} onChange={(e) => setForm({ ...form, points_first: e.target.value })} placeholder="10" />
            <p className="text-xs text-muted-foreground">Season points awarded on completion</p>
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

          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || uploadingImage || !form.name.trim()} className="w-full">
            {createMutation.isPending ? "Creating..." : "Create Quest"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuestDialog;
