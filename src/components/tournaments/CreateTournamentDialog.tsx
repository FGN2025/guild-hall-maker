import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface Props {
  onCreate: (data: {
    name: string;
    game: string;
    description?: string;
    format: string;
    max_participants: number;
    prize_pool?: string;
    start_date: string;
    rules?: string;
  }) => void;
  isCreating: boolean;
}

const CreateTournamentDialog = ({ onCreate, isCreating }: Props) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("single_elimination");
  const [maxParticipants, setMaxParticipants] = useState("16");
  const [prizePool, setPrizePool] = useState("");
  const [startDate, setStartDate] = useState("");
  const [rules, setRules] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: name.trim(),
      game: game.trim(),
      description: description.trim() || undefined,
      format,
      max_participants: parseInt(maxParticipants) || 16,
      prize_pool: prizePool.trim() || undefined,
      start_date: new Date(startDate).toISOString(),
      rules: rules.trim() || undefined,
    });
    setOpen(false);
    setName(""); setGame(""); setDescription(""); setFormat("single_elimination");
    setMaxParticipants("16"); setPrizePool(""); setStartDate(""); setRules("");
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
            <Input value={game} onChange={(e) => setGame(e.target.value)} required maxLength={100}
              className="bg-card border-border font-body" placeholder="e.g. Apex Legends" />
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
               <Label className="font-heading text-sm">Start Date *</Label>
               <Input type="text" placeholder="e.g. 02/28/2026, 02:00 PM" value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)}
                 required className="bg-card border-border font-body" />
             </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm">Prize Pool</Label>
              <Input value={prizePool} onChange={(e) => setPrizePool(e.target.value)} maxLength={50}
                className="bg-card border-border font-body" placeholder="e.g. $5,000" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Rules</Label>
            <Textarea value={rules} onChange={(e) => setRules(e.target.value)} maxLength={2000}
              className="bg-card border-border font-body min-h-[80px]" placeholder="Tournament rules..." />
          </div>
          <Button type="submit" disabled={isCreating}
            className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5">
            {isCreating ? "Creating..." : "Create Tournament"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTournamentDialog;
