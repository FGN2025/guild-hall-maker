import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Game, GameInsert } from "@/hooks/useGames";

const CATEGORIES = ["General", "Fighting", "Shooter", "Sports", "Party", "Racing", "Strategy", "RPG", "Puzzle", "Adventure"];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (game: GameInsert | (Partial<GameInsert> & { id: string })) => void;
  loading?: boolean;
  editGame?: Game | null;
}

const AddGameDialog = ({ open, onOpenChange, onSubmit, loading, editGame }: Props) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [guideContent, setGuideContent] = useState("");
  const [platformTags, setPlatformTags] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editGame) {
      setName(editGame.name);
      setSlug(editGame.slug);
      setDescription(editGame.description ?? "");
      setCategory(editGame.category);
      setCoverImageUrl(editGame.cover_image_url ?? "");
      setGuideContent(editGame.guide_content ?? "");
      setPlatformTags((editGame.platform_tags ?? []).join(", "));
      setIsActive(editGame.is_active);
    } else {
      setName(""); setSlug(""); setDescription(""); setCategory("General");
      setCoverImageUrl(""); setGuideContent(""); setPlatformTags(""); setIsActive(true);
    }
  }, [editGame, open]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!editGame) setSlug(slugify(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = platformTags.split(",").map(t => t.trim()).filter(Boolean);
    const payload: any = {
      name, slug: slug || slugify(name), description: description || null,
      category, cover_image_url: coverImageUrl || null,
      guide_content: guideContent || null, platform_tags: tags, is_active: isActive,
    };
    if (editGame) payload.id = editGame.id;
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editGame ? "Edit Game" : "Add Game"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={e => handleNameChange(e.target.value)} required />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cover Image URL</Label>
            <Input value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>User Guide</Label>
            <Textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} rows={6} placeholder="Markdown or plain text..." />
          </div>
          <div>
            <Label>Platform Tags (comma separated)</Label>
            <Input value={platformTags} onChange={e => setPlatformTags(e.target.value)} placeholder="PC, PS5, Xbox" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>
          <Button type="submit" disabled={loading || !name} className="w-full">
            {loading ? "Saving..." : editGame ? "Save Changes" : "Add Game"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGameDialog;
