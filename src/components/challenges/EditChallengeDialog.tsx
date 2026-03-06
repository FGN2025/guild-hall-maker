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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditChallengeDialogProps {
  challenge: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invalidateQueryKey: string[];
}

const EditChallengeDialog = ({ challenge, open, onOpenChange, invalidateQueryKey }: EditChallengeDialogProps) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [challengeType, setChallengeType] = useState("one_time");
  const [gameId, setGameId] = useState<string | null>(null);
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

  const { data: games = [] } = useQuery({
    queryKey: ["games-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("id, name").eq("is_active", true).order("name");
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
      setPointsFirst(challenge.points_first ?? 10);
      setPointsSecond(challenge.points_second ?? 5);
      setPointsThird(challenge.points_third ?? 3);
      setPointsParticipation(challenge.points_participation ?? 2);
      setStartDate(challenge.start_date ? challenge.start_date.slice(0, 10) : "");
      setEndDate(challenge.end_date ? challenge.end_date.slice(0, 10) : "");
      setEstimatedMinutes(challenge.estimated_minutes ?? "");
      setRequiresEvidence(challenge.requires_evidence ?? true);
      setCoverImageUrl(challenge.cover_image_url || "");
      setMaxEnrollments(challenge.max_enrollments ?? "");
      setIsActive(challenge.is_active ?? true);
    }
  }, [challenge, open]);

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("challenges").update({
        name,
        description: description || null,
        difficulty,
        challenge_type: challengeType,
        game_id: gameId || null,
        points_first: pointsFirst,
        points_second: pointsSecond,
        points_third: pointsThird,
        points_participation: pointsParticipation,
        start_date: startDate || null,
        end_date: endDate || null,
        estimated_minutes: estimatedMinutes || null,
        requires_evidence: requiresEvidence,
        cover_image_url: coverImageUrl || null,
        max_enrollments: maxEnrollments || null,
        is_active: isActive,
      }).eq("id", challenge.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
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
            <Label>Cover Image URL</Label>
            <Input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." />
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
          <Button className="w-full" onClick={() => editMutation.mutate()} disabled={!name.trim() || editMutation.isPending}>
            {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditChallengeDialog;
