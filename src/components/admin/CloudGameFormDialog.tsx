import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CloudGame, CloudGameInput } from "@/hooks/useCloudGames";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game?: CloudGame | null;
  onSubmit: (data: CloudGameInput) => void;
  isPending: boolean;
}

const CloudGameFormDialog = ({ open, onOpenChange, game, onSubmit, isPending }: Props) => {
  const [title, setTitle] = useState("");
  const [blacknutGameId, setBlacknutGameId] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [genre, setGenre] = useState("");
  const [deepLinkUrl, setDeepLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (game) {
      setTitle(game.title);
      setBlacknutGameId(game.blacknut_game_id);
      setDescription(game.description || "");
      setCoverUrl(game.cover_url || "");
      setGenre(game.genre || "");
      setDeepLinkUrl(game.deep_link_url || "");
      setIsActive(game.is_active);
    } else {
      setTitle("");
      setBlacknutGameId("");
      setDescription("");
      setCoverUrl("");
      setGenre("");
      setDeepLinkUrl("");
      setIsActive(true);
    }
  }, [game, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      blacknut_game_id: blacknutGameId.trim(),
      description: description.trim() || null,
      cover_url: coverUrl.trim() || null,
      genre: genre.trim() || null,
      deep_link_url: deepLinkUrl.trim() || null,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{game ? "Edit Cloud Game" : "Add Cloud Game"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Blacknut Game ID *</Label>
              <Input value={blacknutGameId} onChange={(e) => setBlacknutGameId(e.target.value)} required placeholder="e.g. blacknut-123" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Genre</Label>
              <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Action, RPG" />
            </div>
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Deep Link URL</Label>
            <Input value={deepLinkUrl} onChange={(e) => setDeepLinkUrl(e.target.value)} placeholder="https://play.blacknut.com/..." />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim() || !blacknutGameId.trim()}>
              {isPending ? "Saving..." : game ? "Update" : "Add Game"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CloudGameFormDialog;
