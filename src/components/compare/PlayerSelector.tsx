import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";

interface Player {
  user_id: string;
  display_name: string | null;
  gamer_tag: string | null;
  avatar_url: string | null;
}

interface PlayerSelectorProps {
  label: string;
  players: Player[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  excludeId?: string | null;
}

const PlayerSelector = ({ label, players, selectedId, onSelect, excludeId }: PlayerSelectorProps) => {
  const filtered = players.filter((p) => p.user_id !== excludeId);
  const selected = players.find((p) => p.user_id === selectedId);

  return (
    <div className="space-y-3">
      <p className="text-xs font-display uppercase tracking-widest text-muted-foreground">{label}</p>
      <Select value={selectedId ?? ""} onValueChange={onSelect}>
        <SelectTrigger className="h-12 bg-card border-border">
          <SelectValue placeholder="Select a player">
            {selected && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selected.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs font-heading">
                    {(selected.gamer_tag || selected.display_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-heading text-sm">{selected.gamer_tag || selected.display_name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filtered.map((p) => (
            <SelectItem key={p.user_id} value={p.user_id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-heading">
                    {(p.gamer_tag || p.display_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{p.gamer_tag || p.display_name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedId && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <User className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm font-body">Pick a player above</p>
        </div>
      )}
    </div>
  );
};

export default PlayerSelector;
