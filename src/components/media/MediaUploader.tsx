import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  onUpload: (data: { file: File; category?: string; tags?: string[] }) => void;
  isUploading: boolean;
}

const CATEGORIES = ["general", "tournament", "badge", "trophy", "banner"];

const MediaUploader = ({ onUpload, isUploading }: Props) => {
  const [dragOver, setDragOver] = useState(false);
  const [category, setCategory] = useState("general");

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/") && !file.type.startsWith("audio/")) return;
        onUpload({ file, category });
      });
    },
    [onUpload, category]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
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
      </div>
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
