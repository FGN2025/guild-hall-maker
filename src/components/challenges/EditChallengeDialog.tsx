import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, ImageIcon, Plus, Trash2, GripVertical, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";
import { useAuth } from "@/contexts/AuthContext";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";

interface EditChallengeDialogProps {
  challenge: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invalidateQueryKey: string[];
}

interface LocalTask {
  id?: string;
  title: string;
  description: string;
  display_order: number;
  _isNew?: boolean;
  _deleted?: boolean;
}

const EditChallengeDialog = ({ challenge, open, onOpenChange, invalidateQueryKey }: EditChallengeDialogProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getPreset } = useImageLimits();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [challengeType, setChallengeType] = useState("one_time");
  const [gameId, setGameId] = useState<string | null>(null);
  const [points, setPoints] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | "">("");
  const [requiresEvidence, setRequiresEvidence] = useState(true);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [maxEnrollments, setMaxEnrollments] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localTasks, setLocalTasks] = useState<LocalTask[]>([]);

  const { data: games = [] } = useQuery({
    queryKey: ["games-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: existingTasks = [] } = useQuery({
    queryKey: ["challenge-tasks-edit", challenge?.id],
    enabled: !!challenge?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_tasks")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (challenge && open) {
      setName(challenge.name || "");
      setDescription(challenge.description || "");
      setDifficulty(challenge.difficulty || "beginner");
      setChallengeType(challenge.challenge_type || "one_time");
      setGameId(challenge.game_id || null);
      setPoints(challenge.points_first ?? 10);
      setStartDate(challenge.start_date ? challenge.start_date.slice(0, 10) : "");
      setEndDate(challenge.end_date ? challenge.end_date.slice(0, 10) : "");
      setEstimatedMinutes(challenge.estimated_minutes ?? "");
      setRequiresEvidence(challenge.requires_evidence ?? true);
      setCoverImageUrl(challenge.cover_image_url || "");
      setImagePreview(challenge.cover_image_url || null);
      setImageFile(null);
      setMaxEnrollments(challenge.max_enrollments ?? "");
      setIsActive(challenge.is_active ?? true);
    }
  }, [challenge, open]);

  useEffect(() => {
    if (open && existingTasks.length >= 0) {
      setLocalTasks(
        existingTasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          display_order: t.display_order,
        }))
      );
    }
  }, [existingTasks, open]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = await validateAndToast(file, getPreset("cardCover"));
    if (!valid) { e.target.value = ""; return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const addTask = () => {
    setLocalTasks((prev) => [
      ...prev,
      { title: "", description: "", display_order: prev.length, _isNew: true },
    ]);
  };

  const updateTask = (index: number, field: "title" | "description", value: string) => {
    setLocalTasks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const removeTask = (index: number) => {
    setLocalTasks((prev) => {
      const task = prev[index];
      if (task._isNew) return prev.filter((_, i) => i !== index);
      return prev.map((t, i) => (i === index ? { ...t, _deleted: true } : t));
    });
  };

  const visibleTasks = localTasks.filter((t) => !t._deleted);

  const editMutation = useMutation({
    mutationFn: async () => {
      let finalCoverUrl = coverImageUrl || null;

      if (imageFile && user) {
        setUploadingImage(true);
        const ext = imageFile.name.split(".").pop() ?? "png";
        const filePath = `challenges/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("app-media").upload(filePath, imageFile, { contentType: imageFile.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(filePath);
          finalCoverUrl = urlData.publicUrl;
          await supabase.from("media_library").insert({
            user_id: user.id, file_name: imageFile.name, file_path: filePath,
            file_type: "image", mime_type: imageFile.type, file_size: imageFile.size,
            url: urlData.publicUrl, category: "general", tags: ["challenge", name.trim()],
          } as any);
        }
        setUploadingImage(false);
      } else if (imagePreview && imagePreview !== coverImageUrl) {
        finalCoverUrl = imagePreview;
      }

      const { error } = await supabase.from("challenges").update({
        name,
        description: description || null,
        difficulty,
        challenge_type: challengeType,
        game_id: gameId || null,
        points_first: points,
        points_second: 0,
        points_third: 0,
        points_participation: 0,
        start_date: startDate || null,
        end_date: endDate || null,
        estimated_minutes: estimatedMinutes || null,
        requires_evidence: requiresEvidence,
        cover_image_url: finalCoverUrl,
        max_enrollments: maxEnrollments || null,
        is_active: isActive,
      }).eq("id", challenge.id);
      if (error) throw error;

      // Sync tasks
      const toDelete = localTasks.filter((t) => t._deleted && t.id);
      const toUpdate = localTasks.filter((t) => !t._deleted && !t._isNew && t.id);
      const toInsert = localTasks.filter((t) => !t._deleted && t._isNew && t.title.trim());

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("challenge_tasks")
          .delete()
          .in("id", toDelete.map((t) => t.id!));
        if (delErr) throw delErr;
      }

      // Re-index display_order based on visible order
      const visible = localTasks.filter((t) => !t._deleted);
      for (let i = 0; i < visible.length; i++) {
        const t = visible[i];
        if (t.id && !t._isNew) {
          const { error: upErr } = await supabase
            .from("challenge_tasks")
            .update({ title: t.title, description: t.description || null, display_order: i })
            .eq("id", t.id);
          if (upErr) throw upErr;
        }
      }

      if (toInsert.length > 0) {
        const visibleBeforeInsert = localTasks.filter((t) => !t._deleted && !t._isNew);
        const { error: insErr } = await supabase.from("challenge_tasks").insert(
          toInsert.map((t, idx) => ({
            challenge_id: challenge.id,
            title: t.title.trim(),
            description: t.description || null,
            display_order: visibleBeforeInsert.length + idx,
          }))
        );
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      queryClient.invalidateQueries({ queryKey: ["challenge-tasks", challenge.id] });
      queryClient.invalidateQueries({ queryKey: ["challenge-tasks-edit", challenge.id] });
      toast.success("Challenge updated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border-border/50">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Challenge</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Game</Label>
              <Select value={gameId || "none"} onValueChange={(v) => setGameId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No game</SelectItem>
                  {games.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={challengeType} onValueChange={setChallengeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-Time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                   <SelectItem value="weekly">Weekly</SelectItem>
                   <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Est. Minutes</Label>
              <Input type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value ? Number(e.target.value) : "")} />
            </div>
          </div>
          <div>
            <Label>Points</Label>
            <Input type="number" min={0} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cover Image</Label>
            <div className="flex items-center gap-3 mt-1">
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
              onSelect={(url) => { setImageFile(null); setImagePreview(url); setCoverImageUrl(url); }}
            />
          </div>
          <div>
            <Label>Max Enrollments</Label>
            <Input type="number" value={maxEnrollments} onChange={(e) => setMaxEnrollments(e.target.value ? Number(e.target.value) : "")} placeholder="Unlimited" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Requires Evidence</Label>
            <Switch checked={requiresEvidence} onCheckedChange={setRequiresEvidence} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Task Management */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-base font-display">Tasks ({visibleTasks.length})</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addTask}>
                <Plus className="h-3.5 w-3.5" /> Add Task
              </Button>
            </div>
            {visibleTasks.length === 0 && (
              <p className="text-xs text-muted-foreground">No tasks yet. Add tasks to create a step-by-step checklist for participants.</p>
            )}
            {localTasks.map((task, index) => {
              if (task._deleted) return null;
              return (
                <div key={task.id || `new-${index}`} className="flex gap-2 items-start p-3 rounded-lg border border-border bg-card/50">
                  <GripVertical className="h-4 w-4 mt-2.5 text-muted-foreground/50 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Task title"
                      value={task.title}
                      onChange={(e) => updateTask(index, "title", e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={task.description}
                      onChange={(e) => updateTask(index, "description", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0 mt-0.5"
                    onClick={() => removeTask(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button className="w-full" onClick={() => editMutation.mutate()} disabled={!name.trim() || editMutation.isPending || uploadingImage}>
            {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditChallengeDialog;
