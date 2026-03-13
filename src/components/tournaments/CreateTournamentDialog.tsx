import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Upload, CalendarIcon, ImageIcon, X, FileText } from "lucide-react";
import { format as formatDate } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useGames } from "@/hooks/useGames";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";
import { useAuth } from "@/contexts/AuthContext";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import PrizePoolSelector from "@/components/tournaments/PrizePoolSelector";
import { useDiscordRoles } from "@/hooks/useDiscordRoles";
import AchievementPicker from "@/components/shared/AchievementPicker";

interface Props {
  onCreate: (data: {
    name: string;
    game: string;
    description?: string;
    format: string;
    max_participants: number;
    prize_pool?: string;
    prize_type?: string;
    prize_id?: string;
    start_date: string;
    rules?: string;
    image_url?: string;
    points_first?: number;
    points_second?: number;
    points_third?: number;
    points_participation?: number;
    prize_pct_first?: number;
    prize_pct_second?: number;
    prize_pct_third?: number;
    discord_role_id?: string;
  }) => void;
  isCreating: boolean;
}

const CreateTournamentDialog = ({ onCreate, isCreating }: Props) => {
  const { user } = useAuth();
  const { getPreset } = useImageLimits();
  const { data: games = [] } = useGames();
  const [open, setOpen] = useState(false);
  const { roles: discordRoles, loading: rolesLoading } = useDiscordRoles(open);
  const [discordRoleId, setDiscordRoleId] = useState("");
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("single_elimination");
  const [maxParticipants, setMaxParticipants] = useState("16");
  const [prizePool, setPrizePool] = useState("");
  const [prizeType, setPrizeType] = useState("none");
  const [prizeId, setPrizeId] = useState("");
  const [startDates, setStartDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState("12:00");
  const [rules, setRules] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [pointsParticipation, setPointsParticipation] = useState("2");
  const [prizePctFirst, setPrizePctFirst] = useState(50);
  const [prizePctSecond, setPrizePctSecond] = useState(30);
  const [prizePctThird, setPrizePctThird] = useState(20);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = await validateAndToast(file, getPreset("tournamentHero"));
    if (!valid) {
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let image_url: string | undefined;

    if (imageFile) {
      setUploadingImage(true);
      const ext = imageFile.name.split(".").pop() ?? "png";
      const filePath = `tournament/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from("app-media").upload(filePath, imageFile, { contentType: imageFile.type });
      if (!error) {
        const { data } = supabase.storage.from("app-media").getPublicUrl(filePath);
        image_url = data.publicUrl;

        // Register in media library
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
    } else if (imagePreview) {
      image_url = imagePreview;
    }

    const sortedDates = [...startDates].sort((a, b) => a.getTime() - b.getTime());

    for (const date of sortedDates) {
      const combinedDate = new Date(date);
      const [hours, minutes] = startTime.split(":").map(Number);
      combinedDate.setHours(hours, minutes, 0, 0);

      const tournamentName = sortedDates.length > 1
        ? `${name.trim()} - ${formatDate(date, "MMM d")}`
        : name.trim();

      onCreate({
        name: tournamentName,
        game: game.trim(),
        description: description.trim() || undefined,
        format,
        max_participants: parseInt(maxParticipants) || 16,
        prize_pool: prizePool.trim() || undefined,
        prize_type: prizeType,
        prize_id: prizeType === "physical" && prizeId ? prizeId : undefined,
        start_date: combinedDate.toISOString(),
        rules: rules.trim() || undefined,
        image_url,
        points_first: 0,
        points_second: 0,
        points_third: 0,
        points_participation: parseInt(pointsParticipation) || 2,
        prize_pct_first: prizePctFirst,
        prize_pct_second: prizePctSecond,
        prize_pct_third: prizePctThird,
        discord_role_id: discordRoleId || undefined,
      });
    }
    setOpen(false);
    setName(""); setGame(""); setDescription(""); setFormat("single_elimination");
    setMaxParticipants("16"); setPrizePool(""); setPrizeType("none"); setPrizeId(""); setStartDates([]); setStartTime("12:00"); setRules("");
    setImageFile(null); setImagePreview(null);
    setPointsParticipation("2");
    setPrizePctFirst(50); setPrizePctSecond(30); setPrizePctThird(20); setDiscordRoleId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-heading gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Create Tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create Tournament</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="font-heading text-sm">Tournament Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
              className="bg-card border-border font-body" placeholder="e.g. Apex Legends Showdown" />
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Game *</Label>
            <Select value={game} onValueChange={setGame} required>
              <SelectTrigger className="bg-card border-border font-body">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
              className="bg-card border-border font-body min-h-[80px]" placeholder="Tournament description..." />
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
               <Label className="font-heading text-sm">Start Date(s) *</Label>
               <Popover>
                 <PopoverTrigger asChild>
                   <Button variant="outline" className={cn(
                     "w-full justify-start text-left font-body bg-card border-border",
                     startDates.length === 0 && "text-muted-foreground"
                   )}>
                     <CalendarIcon className="mr-2 h-4 w-4" />
                     {startDates.length === 0
                       ? "Pick date(s)"
                       : startDates.length === 1
                         ? formatDate(startDates[0], "PPP")
                         : `${startDates.length} dates selected`}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0" align="start">
                   <Calendar
                     mode="multiple"
                     selected={startDates}
                     onSelect={(dates) => setStartDates(dates || [])}
                     disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                     initialFocus
                     className={cn("p-3 pointer-events-auto")}
                   />
                 </PopoverContent>
               </Popover>
               {startDates.length > 0 && (
                 <div className="flex flex-wrap gap-1.5 pt-1">
                   {[...startDates].sort((a, b) => a.getTime() - b.getTime()).map((d, i) => (
                     <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
                       {formatDate(d, "MMM d")}
                       <button type="button" onClick={() => setStartDates(prev => prev.filter((_, idx) => idx !== i))}
                         className="hover:text-destructive transition-colors">
                         <X className="h-3 w-3" />
                       </button>
                     </span>
                   ))}
                 </div>
               )}
             </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm">Start Time *</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                required className="bg-card border-border font-body" />
             </div>
          </div>
          <PrizePoolSelector
            prizeType={prizeType}
            onPrizeTypeChange={setPrizeType}
            prizePool={prizePool}
            onPrizePoolChange={setPrizePool}
            prizeId={prizeId}
            onPrizeIdChange={setPrizeId}
            pointsFirst={0}
            pointsSecond={0}
            pointsThird={0}
            prizePctFirst={prizePctFirst}
            prizePctSecond={prizePctSecond}
            prizePctThird={prizePctThird}
            onPrizePctFirstChange={setPrizePctFirst}
            onPrizePctSecondChange={setPrizePctSecond}
            onPrizePctThirdChange={setPrizePctThird}
          />
          <div className="space-y-2">
            <Label className="font-heading text-sm">Hero Image</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card text-sm font-heading text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <Upload className="h-4 w-4" />
                {imageFile ? imageFile.name : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
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
              onSelect={(url) => {
                setImageFile(null);
                setImagePreview(url);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Participation Points</Label>
            <p className="text-xs text-muted-foreground">Points awarded per match played</p>
            <Input type="number" min={0} value={pointsParticipation} onChange={(e) => setPointsParticipation(e.target.value)} className="bg-card border-border font-body max-w-[120px]" />
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Discord Role (on registration)</Label>
            <Select value={discordRoleId} onValueChange={setDiscordRoleId}>
              <SelectTrigger className="bg-card border-border font-body">
                <SelectValue placeholder={rolesLoading ? "Loading roles…" : "None"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {discordRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Automatically assign this Discord role when a player registers</p>
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Rules</Label>
            {(() => {
              const selectedGame = games.find((g) => g.name === game);
              const hasGamePdf = selectedGame?.tournament_rules_url;
              return (
                <div className="space-y-2">
                  {hasGamePdf && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {selectedGame.name} has standard rules PDF
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto text-xs h-7"
                        onClick={() => setRules(selectedGame.tournament_rules_url!)}
                      >
                        Use Game Rules PDF
                      </Button>
                    </div>
                  )}
                  {rules && /^https?:\/\/.+\.pdf(\?.*)?$/i.test(rules) ? (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border">
                      <FileText className="h-4 w-4 text-primary" />
                      <a href={rules} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate">
                        View Rules PDF
                      </a>
                      <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 text-xs"
                        onClick={() => setRules("")}>
                        Switch to Freeform
                      </Button>
                    </div>
                  ) : (
                    <Textarea value={rules} onChange={(e) => setRules(e.target.value)} maxLength={2000}
                      className="bg-card border-border font-body min-h-[80px]" placeholder="Tournament rules..." />
                  )}
                </div>
              );
            })()}
          </div>
          <Button type="submit" disabled={isCreating || uploadingImage || startDates.length === 0}
            className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5">
            {isCreating ? "Creating..." : startDates.length > 1 ? `Create ${startDates.length} Tournaments` : "Create Tournament"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTournamentDialog;
