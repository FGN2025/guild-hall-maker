import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, CalendarIcon, Upload } from "lucide-react";
import { format as formatDate } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";

interface TournamentData {
  id: string;
  name: string;
  game: string;
  description: string | null;
  format: string;
  max_participants: number;
  prize_pool: string | null;
  start_date: string;
  rules: string | null;
}

interface Props {
  tournament: TournamentData;
  onUpdate: (data: {
    name: string;
    game: string;
    description?: string;
    format: string;
    max_participants: number;
    prize_pool?: string;
    start_date: string;
    rules?: string;
    image_url?: string;
  }) => void;
  isUpdating: boolean;
}

const EditTournamentDialog = ({ tournament, onUpdate, isUpdating }: Props) => {
  const { user } = useAuth();
  const { getPreset } = useImageLimits();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("single_elimination");
  const [maxParticipants, setMaxParticipants] = useState("16");
  const [prizePool, setPrizePool] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("12:00");
  const [rules, setRules] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (open && tournament) {
      setName(tournament.name);
      setGame(tournament.game);
      setDescription(tournament.description ?? "");
      setFormat(tournament.format);
      setMaxParticipants(String(tournament.max_participants));
      setPrizePool(tournament.prize_pool ?? "");
      setRules(tournament.rules ?? "");
      const d = new Date(tournament.start_date);
      setStartDate(d);
      setStartTime(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
    }
  }, [open, tournament]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = await validateAndToast(file, getPreset("tournamentHero"));
    if (!valid) { e.target.value = ""; return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    let image_url: string | undefined;
    if (imageFile) {
      setUploadingImage(true);
      const ext = imageFile.name.split(".").pop() ?? "png";
      const filePath = `tournament/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from("app-media").upload(filePath, imageFile, { contentType: imageFile.type });
      if (!error) {
        const { data } = supabase.storage.from("app-media").getPublicUrl(filePath);
        image_url = data.publicUrl;
        if (user) {
          await supabase.from("media_library").insert({
            user_id: user.id,
            file_name: imageFile.name,
            file_path: filePath,
            file_type: "image",
            mime_type: imageFile.type,
            file_size: imageFile.size,
            url: data.publicUrl,
            category: "tournament",
            tags: ["tournament-hero", name.trim()],
          } as any);
        }
      }
      setUploadingImage(false);
    }

    const combinedDate = new Date(startDate);
    const [hours, minutes] = startTime.split(":").map(Number);
    combinedDate.setHours(hours, minutes, 0, 0);

    onUpdate({
      name: name.trim(),
      game: game.trim(),
      description: description.trim() || undefined,
      format,
      max_participants: parseInt(maxParticipants) || 16,
      prize_pool: prizePool.trim() || undefined,
      start_date: combinedDate.toISOString(),
      rules: rules.trim() || undefined,
      image_url,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-heading gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Pencil className="h-4 w-4" /> Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit Tournament</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="font-heading text-sm">Tournament Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
              className="bg-card border-border font-body" />
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Game *</Label>
            <Input value={game} onChange={(e) => setGame(e.target.value)} required maxLength={100}
              className="bg-card border-border font-body" />
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
              className="bg-card border-border font-body min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-heading text-sm">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="bg-card border-border font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_elimination">Single Elimination</SelectItem>
                  <SelectItem value="double_elimination">Double Elimination</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="swiss">Swiss</SelectItem>
                  <SelectItem value="battle_royale">Battle Royale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm">Max Players</Label>
              <Input type="number" min={2} max={256} value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="bg-card border-border font-body" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-heading text-sm">Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(
                    "w-full justify-start text-left font-body bg-card border-border",
                    !startDate && "text-muted-foreground"
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? formatDate(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm">Start Time *</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                required className="bg-card border-border font-body" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Prize Pool</Label>
            <Input value={prizePool} onChange={(e) => setPrizePool(e.target.value)} maxLength={50}
              className="bg-card border-border font-body" placeholder="e.g. $5,000" />
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Hero Image</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card text-sm font-heading text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <Upload className="h-4 w-4" />
                {imageFile ? imageFile.name : "Choose image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="h-10 w-10 rounded object-cover border border-border" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Rules</Label>
            <Textarea value={rules} onChange={(e) => setRules(e.target.value)} maxLength={2000}
              className="bg-card border-border font-body min-h-[80px]" />
          </div>
          <Button type="submit" disabled={isUpdating || uploadingImage || !startDate}
            className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5">
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTournamentDialog;
