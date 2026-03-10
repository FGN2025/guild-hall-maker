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
import { Loader2, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";
import { useAuth } from "@/contexts/AuthContext";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";

interface EditQuestDialogProps {
  quest: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invalidateQueryKey: string[];
}

const EditQuestDialog = ({ quest, open, onOpenChange, invalidateQueryKey }: EditQuestDialogProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getPreset } = useImageLimits();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [challengeType, setChallengeType] = useState("one_time");
  const [gameId, setGameId] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [chainOrder, setChainOrder] = useState(0);
  const [storyIntro, setStoryIntro] = useState("");
  const [storyOutro, setStoryOutro] = useState("");
  const [xpReward, setXpReward] = useState(0);
  const [pointsFirst, setPointsFirst] = useState(10);
  const [pointsSecond, setPointsSecond] = useState(5);
  const [pointsThird, setPointsThird] = useState(3);
  const [pointsParticipation, setPointsParticipation] = useState(2);
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

  const { data: games = [] } = useQuery({
    queryKey: ["games-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: questChains = [] } = useQuery({
    queryKey: ["edit-quest-chains"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quest_chains").select("id, name").order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (quest && open) {
      setName(quest.name || "");
      setDescription(quest.description || "");
      setDifficulty(quest.difficulty || "beginner");
      setChallengeType(quest.challenge_type || "one_time");
      setGameId(quest.game_id || null);
      setChainId(quest.chain_id || null);
      setChainOrder(quest.chain_order ?? 0);
      setStoryIntro(quest.story_intro || "");
      setStoryOutro(quest.story_outro || "");
      setXpReward(quest.xp_reward ?? 0);
      setPointsFirst(quest.points_first ?? 10);
      setPointsSecond(quest.points_second ?? 5);
      setPointsThird(quest.points_third ?? 3);
      setPointsParticipation(quest.points_participation ?? 2);
      setStartDate(quest.start_date ? quest.start_date.slice(0, 10) : "");
      setEndDate(quest.end_date ? quest.end_date.slice(0, 10) : "");
      setEstimatedMinutes(quest.estimated_minutes ?? "");
      setRequiresEvidence(quest.requires_evidence ?? true);
      setCoverImageUrl(quest.cover_image_url || "");
      setImagePreview(quest.cover_image_url || null);
      setImageFile(null);
      setMaxEnrollments(quest.max_enrollments ?? "");
      setIsActive(quest.is_active ?? true);
    }
  }, [quest, open]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = await validateAndToast(file, getPreset("cardCover"));
    if (!valid) { e.target.value = ""; return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      let finalCoverUrl = coverImageUrl || null;

      if (imageFile && user) {
        setUploadingImage(true);
        const ext = imageFile.name.split(".").pop() ?? "png";
        const filePath = `quests/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("app-media").upload(filePath, imageFile, { contentType: imageFile.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(filePath);
          finalCoverUrl = urlData.publicUrl;
          await supabase.from("media_library").insert({
            user_id: user.id, file_name: imageFile.name, file_path: filePath,
            file_type: "image", mime_type: imageFile.type, file_size: imageFile.size,
            url: urlData.publicUrl, category: "general", tags: ["quest", name.trim()],
          } as any);
        }
        setUploadingImage(false);
      } else if (imagePreview && imagePreview !== coverImageUrl) {
        finalCoverUrl = imagePreview;
      }

      const { error } = await supabase.from("quests").update({
        name,
        description: description || null,
        difficulty,
        challenge_type: challengeType,
        game_id: gameId || null,
        chain_id: chainId || null,
        chain_order: chainId ? chainOrder : 0,
        story_intro: storyIntro || null,
        story_outro: storyOutro || null,
        xp_reward: xpReward,
        points_first: pointsFirst,
        points_second: pointsSecond,
        points_third: pointsThird,
        points_participation: pointsParticipation,
        start_date: startDate || null,
        end_date: endDate || null,
        estimated_minutes: estimatedMinutes || null,
        requires_evidence: requiresEvidence,
        cover_image_url: finalCoverUrl,
        max_enrollments: maxEnrollments || null,
        is_active: isActive,
      } as any).eq("id", quest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      toast.success("Quest updated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border-border/50">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Quest</DialogTitle>
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
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Est. Minutes</Label>
              <Input type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value ? Number(e.target.value) : "")} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">1st Pts</Label>
              <Input type="number" value={pointsFirst} onChange={(e) => setPointsFirst(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">2nd Pts</Label>
              <Input type="number" value={pointsSecond} onChange={(e) => setPointsSecond(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">3rd Pts</Label>
              <Input type="number" value={pointsThird} onChange={(e) => setPointsThird(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Other Pts</Label>
              <Input type="number" value={pointsParticipation} onChange={(e) => setPointsParticipation(Number(e.target.value))} />
            </div>
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
          {/* Chain & Story Fields */}
          <div className="space-y-3 border-t border-border pt-3">
            <Label className="text-sm font-semibold">Quest Chain & Story</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Chain</Label>
                <Select value={chainId || "none"} onValueChange={(v) => setChainId(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No chain</SelectItem>
                    {questChains.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Chain Order</Label>
                <Input type="number" min={0} value={chainOrder} onChange={(e) => setChainOrder(Number(e.target.value))} disabled={!chainId} />
              </div>
            </div>
            <div>
              <Label className="text-xs">XP Reward</Label>
              <Input type="number" min={0} value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Story Intro</Label>
              <Textarea value={storyIntro} onChange={(e) => setStoryIntro(e.target.value)} rows={2} placeholder="Narrative shown at start..." />
            </div>
            <div>
              <Label className="text-xs">Story Outro</Label>
              <Textarea value={storyOutro} onChange={(e) => setStoryOutro(e.target.value)} rows={2} placeholder="Narrative shown on completion..." />
            </div>
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
          <Button className="w-full" onClick={() => editMutation.mutate()} disabled={!name.trim() || editMutation.isPending || uploadingImage}>
            {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditQuestDialog;
