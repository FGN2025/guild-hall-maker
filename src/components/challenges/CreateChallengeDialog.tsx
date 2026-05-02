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
import { Plus, Sparkles, Loader2, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import AchievementPicker from "@/components/shared/AchievementPicker";
import PointsInput from "@/components/shared/PointsInput";
import TaskVerificationEditor, { type VerificationType } from "@/components/challenges/TaskVerificationEditor";

type TaskDraft = {
  title: string;
  description: string;
  verification_type: VerificationType;
  steam_achievement_api_name: string | null;
  steam_playtime_minutes: number | null;
};

interface CreateChallengeDialogProps {
  invalidateQueryKey: string[];
  trigger: React.ReactNode;
}

const defaultForm = {
  name: "", description: "", challenge_type: "one_time",
  start_date: "", end_date: "",
  points: "10",
  difficulty: "beginner", estimated_minutes: "", requires_evidence: true,
  cover_image_url: "",
  tasks: [] as TaskDraft[],
  academy_next_step_url: "",
  academy_next_step_label: "",
  points_override_reason: "",
};

const CreateChallengeDialog = ({ invalidateQueryKey, trigger }: CreateChallengeDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getPreset } = useImageLimits();
  const [open, setOpen] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [selectedGameId, setSelectedGameId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [achievementId, setAchievementId] = useState("");

  const { data: games = [] } = useQuery({
    queryKey: ["create-challenge-games"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("id, name, steam_app_id").eq("is_active", true).order("name");
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
        const filePath = `challenges/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("app-media").upload(filePath, imageFile, { contentType: imageFile.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(filePath);
          coverUrl = urlData.publicUrl;
          await supabase.from("media_library").insert({
            user_id: user.id, file_name: imageFile.name, file_path: filePath,
            file_type: "image", mime_type: imageFile.type, file_size: imageFile.size,
            url: urlData.publicUrl, category: "general", tags: ["challenge", form.name.trim()],
          } as any);
        }
        setUploadingImage(false);
      } else if (imagePreview) {
        coverUrl = imagePreview;
      }

      const { data: challenge, error } = await supabase.from("challenges").insert({
        name: form.name,
        description: form.description || null,
        points_reward: parseInt(form.points) || 10,
        challenge_type: form.challenge_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        created_by: user.id,
        points_first: parseInt(form.points) || 10,
        points_second: 0,
        points_third: 0,
        points_participation: 0,
        difficulty: form.difficulty,
        estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null,
        requires_evidence: form.requires_evidence,
        cover_image_url: coverUrl,
        game_id: selectedGameId || null,
        achievement_id: achievementId && achievementId !== "none" ? achievementId : null,
        academy_next_step_url: form.academy_next_step_url || null,
        academy_next_step_label: form.academy_next_step_label || null,
        points_override_reason: form.points_override_reason?.trim() || null,
        points_overridden_by: form.points_override_reason?.trim() ? user.id : null,
      } as any).select().single();
      if (error) throw error;

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
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      toast.success("Challenge created!");
      setOpen(false);
      setForm({ ...defaultForm });
      setSelectedGameId("");
      setAchievementId("");
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTask = () => setForm(f => ({ ...f, tasks: [...f.tasks, { title: "", description: "" }] }));
  const removeTask = (i: number) => setForm(f => ({ ...f, tasks: f.tasks.filter((_, idx) => idx !== i) }));
  const updateTask = (i: number, field: string, val: string) =>
    setForm(f => ({ ...f, tasks: f.tasks.map((t, idx) => idx === i ? { ...t, [field]: val } : t) }));

  const enhanceDescription = async () => {
    setEnhancing(true);
    try {
      const gameName = selectedGameId ? games.find((g: any) => g.id === selectedGameId)?.name : undefined;
      const taskTitles = form.tasks.map(t => t.title).filter(Boolean);
      const { data, error } = await supabase.functions.invoke('enhance-challenge-description', {
        body: {
          name: form.name,
          description: form.description,
          challenge_type: form.challenge_type,
          game_name: gameName,
          difficulty: form.difficulty,
          estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : undefined,
          tasks: taskTitles.length > 0 ? taskTitles : undefined,
          cover_image_url: imagePreview || undefined,
        },
      });
      if (error) throw error;
      if (data?.enhanced_description) {
        setForm(f => ({ ...f, description: data.enhanced_description }));
        toast.success("Description enhanced!");
      }
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setEnhancing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
              onClick={enhanceDescription}
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
                  <SelectItem value="monthly">Monthly</SelectItem>
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

          <AchievementPicker value={achievementId} onChange={setAchievementId} />

          <div className="flex items-center gap-3">
            <Switch checked={form.requires_evidence} onCheckedChange={(v) => setForm({ ...form, requires_evidence: v })} />
            <Label>Requires evidence upload</Label>
          </div>

          <PointsInput
            kind="challenge"
            difficulty={form.difficulty}
            type={form.challenge_type}
            value={parseInt(form.points) || 0}
            onChange={(v) => setForm({ ...form, points: String(v) })}
            overrideReason={form.points_override_reason}
            onOverrideReasonChange={(r) => setForm({ ...form, points_override_reason: r })}
          />

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

          {/* Academy Next Step */}
          <div className="space-y-3 border-t border-border pt-4">
            <Label className="text-base font-display">Academy Next Step (optional)</Label>
            <p className="text-xs text-muted-foreground">Direct players to an FGN Academy course after completing this challenge.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Next Step Label</Label>
                <Input value={form.academy_next_step_label} onChange={(e) => setForm({ ...form, academy_next_step_label: e.target.value })} placeholder="e.g. OSHA Safety Fundamentals" />
              </div>
              <div className="space-y-1">
                <Label>Next Step URL</Label>
                <Input value={form.academy_next_step_url} onChange={(e) => setForm({ ...form, academy_next_step_url: e.target.value })} placeholder="https://fgn.academy/courses/..." />
              </div>
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
            {createMutation.isPending ? "Creating..." : "Create Challenge"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChallengeDialog;
