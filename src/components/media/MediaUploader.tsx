import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateAndToast, IMAGE_PRESETS } from "@/lib/imageValidation";

interface Props {
  onUpload: (data: { file: File; category?: string; tags?: string[] }) => void;
  isUploading: boolean;
}

const CATEGORIES = ["general", "tournament", "badge", "trophy", "banner"];
const MAX_TAGS = 10;

const MediaUploader = ({ onUpload, isUploading }: Props) => {
  const [dragOver, setDragOver] = useState(false);
  const [category, setCategory] = useState("general");
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

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/") && !file.type.startsWith("audio/")) continue;
        if (file.type.startsWith("image/")) {
          const ok = await validateAndToast(file, IMAGE_PRESETS.general);
          if (!ok) continue;
        }
        onUpload({ file, category, tags });
      }
      setTags([]);
      setTagInput("");
    },
    [onUpload, category, tags]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px] bg-card border-border font-heading text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder={tags.length >= MAX_TAGS ? "Tag limit reached" : "Add tags (Enter or comma)"}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          disabled={tags.length >= MAX_TAGS}
          className="flex-1 bg-card border-border font-body text-sm"
        />
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
      <div
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-heading text-sm text-muted-foreground mb-2">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">Images, videos, and audio files supported</p>
        <input
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaUploader;
