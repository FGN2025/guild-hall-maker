import { useState, useRef } from "react";
import { Code2, Plus, X, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const MAX_TAGS = 10;

const AddEmbedDialog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed for thumbnails");
      return;
    }
    setThumbnailFile(file);
    setThumbnailUrl("");
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleUrlChange = (value: string) => {
    setThumbnailUrl(value);
    if (value.trim()) {
      setThumbnailFile(null);
      setThumbnailPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailUrl("");
    setThumbnailPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    setDisplayName("");
    setEmbedCode("");
    setThumbnailUrl("");
    setThumbnailFile(null);
    setThumbnailPreview("");
    setTags([]);
    setTagInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadThumbnailFile = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() ?? "png";
    const fileName = `widget/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error } = await supabase.storage.from("app-media").upload(fileName, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("app-media").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim() || !embedCode.trim()) {
      toast.error("Display name and embed code are required");
      return;
    }
    setSaving(true);
    try {
      let finalUrl = thumbnailUrl.trim() || "embed";

      if (thumbnailFile) {
        setUploading(true);
        finalUrl = await uploadThumbnailFile(thumbnailFile);
        setUploading(false);
      }

      const { error } = await supabase.from("media_library").insert({
        user_id: user.id,
        file_name: displayName.trim(),
        file_path: "embed",
        file_type: "embed",
        mime_type: "text/html",
        file_size: embedCode.length,
        url: finalUrl,
        category: "widget",
        tags,
        embed_code: embedCode.trim(),
      } as any);
      if (error) throw error;
      toast.success("Embed widget saved to media library");
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save embed");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const previewSrc = thumbnailPreview || (thumbnailUrl.trim().startsWith("http") ? thumbnailUrl.trim() : "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-heading gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Code2 className="h-4 w-4" />
          Add Embed
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Add Embed Widget
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-heading text-sm">Display Name *</Label>
            <Input
              placeholder="e.g. News Ticker, Countdown Timer"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-card border-border font-body"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm">Embed Code *</Label>
            <Textarea
              placeholder='Paste Common Ninja embed HTML here...'
              value={embedCode}
              onChange={(e) => setEmbedCode(e.target.value)}
              rows={5}
              className="bg-card border-border font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm">Thumbnail (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://... preview image URL"
                value={thumbnailUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="bg-card border-border font-body flex-1"
                disabled={!!thumbnailFile}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!thumbnailUrl.trim()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            {(thumbnailFile || thumbnailUrl.trim()) && (
              <div className="flex items-center gap-2 mt-1.5">
                {previewSrc ? (
                  <img src={previewSrc} alt="Thumbnail preview" className="h-12 w-12 rounded object-cover border border-border" />
                ) : (
                  <div className="h-12 w-12 rounded border border-border bg-muted flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {thumbnailFile ? thumbnailFile.name : thumbnailUrl.trim()}
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={clearThumbnail}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="font-heading text-sm">Tags</Label>
            <Input
              placeholder={tags.length >= MAX_TAGS ? "Tag limit reached" : "Add tags (Enter or comma)"}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={tags.length >= MAX_TAGS}
              className="bg-card border-border font-body text-sm"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading} className="font-heading gap-2">
              {(saving || uploading) ? <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <Plus className="h-4 w-4" />}
              Save Widget
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmbedDialog;
