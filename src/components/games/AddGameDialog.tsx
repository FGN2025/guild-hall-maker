import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2, ImageIcon, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";
import { toast } from "@/hooks/use-toast";
import type { Game, GameInsert } from "@/hooks/useGames";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";

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
  const { getPreset } = useImageLimits();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [guideContent, setGuideContent] = useState("");
  const [platformTags, setPlatformTags] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [tournamentRulesUrl, setTournamentRulesUrl] = useState("");
  const [steamAppId, setSteamAppId] = useState("");
  const [uploadingRules, setUploadingRules] = useState(false);
  const rulesFileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await validateAndToast(file, getPreset("cardCover"));
    if (!ok) { if (fileInputRef.current) fileInputRef.current.value = ""; return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const path = `games/${fileName}`;
      const { error } = await supabase.storage.from("app-media").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("app-media").getPublicUrl(path);
      setCoverImageUrl(publicUrl);

      // Register in media_library so it appears in Media Management
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let fileType = "image";
        if (file.type.startsWith("video/")) fileType = "video";
        else if (file.type.startsWith("audio/")) fileType = "audio";

        await supabase.from("media_library").insert({
          user_id: user.id,
          file_name: file.name,
          file_path: path,
          file_type: fileType,
          mime_type: file.type,
          file_size: file.size,
          url: publicUrl,
          category: "games",
          tags: ["game-cover"],
        } as any);
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      setTournamentRulesUrl(editGame.tournament_rules_url ?? "");
    } else {
      setName(""); setSlug(""); setDescription(""); setCategory("General");
      setCoverImageUrl(""); setGuideContent(""); setPlatformTags(""); setIsActive(true);
      setTournamentRulesUrl("");
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
      tournament_rules_url: tournamentRulesUrl || null,
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
            <Label>Cover Image</Label>
            {coverImageUrl && (
              <div className="relative w-32 h-40 mt-1 mb-2 rounded-lg overflow-hidden border border-border">
                <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImageUrl("")}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive/80 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaPickerOpen(true)}
                className="gap-1"
              >
                <ImageIcon className="h-4 w-4" />
                Media Library
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-1"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Input
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
                placeholder="Or paste URL..."
                className="flex-1"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <MediaPickerDialog
              open={mediaPickerOpen}
              onOpenChange={setMediaPickerOpen}
              onSelect={(url) => setCoverImageUrl(url)}
            />
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
            <Label>Tournament Rules PDF</Label>
            {tournamentRulesUrl && (
              <div className="flex items-center gap-2 mt-1 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <a href={tournamentRulesUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-primary underline truncate max-w-[200px]">
                  View current PDF
                </a>
                <button type="button" onClick={() => setTournamentRulesUrl("")}
                  className="bg-background/80 rounded-full p-0.5 hover:bg-destructive/80 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => rulesFileInputRef.current?.click()}
              disabled={uploadingRules}
              className="gap-1"
            >
              {uploadingRules ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingRules ? "Uploading..." : "Upload PDF"}
            </Button>
            <input
              ref={rulesFileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.type !== "application/pdf") {
                  toast({ title: "Invalid file", description: "Only PDF files are allowed.", variant: "destructive" });
                  if (rulesFileInputRef.current) rulesFileInputRef.current.value = "";
                  return;
                }
                setUploadingRules(true);
                try {
                  const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.pdf`;
                  const path = `game-rules/${fileName}`;
                  const { error } = await supabase.storage.from("app-media").upload(path, file, { contentType: file.type });
                  if (error) throw error;
                  const { data: { publicUrl } } = supabase.storage.from("app-media").getPublicUrl(path);
                  setTournamentRulesUrl(publicUrl);
                } catch (err: any) {
                  toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                } finally {
                  setUploadingRules(false);
                  if (rulesFileInputRef.current) rulesFileInputRef.current.value = "";
                }
              }}
            />
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
