import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, CalendarIcon } from "lucide-react";
import { format as formatDate } from "date-fns";
import { cn } from "@/lib/utils";

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
  }) => void;
  isUpdating: boolean;
}

const EditTournamentDialog = ({ tournament, onUpdate, isUpdating }: Props) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

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
            <Label className="font-heading text-sm">Rules</Label>
            <Textarea value={rules} onChange={(e) => setRules(e.target.value)} maxLength={2000}
              className="bg-card border-border font-body min-h-[80px]" />
          </div>
          <Button type="submit" disabled={isUpdating || !startDate}
            className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5">
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTournamentDialog;
