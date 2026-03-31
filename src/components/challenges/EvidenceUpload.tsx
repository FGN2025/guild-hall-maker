import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, Loader2, Image as ImageIcon, Link, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface EvidenceUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  taskTitle?: string;
  onSubmit: (data: { taskId?: string; fileUrl: string; fileType: string; notes?: string }) => Promise<void>;
}

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const isValidVideoUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
};

const EvidenceUpload = ({ open, onOpenChange, taskId, taskTitle, onSubmit }: EvidenceUploadProps) => {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState("image");
  const [videoLink, setVideoLink] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setMode("upload");
    setNotes("");
    setPreviewUrl(null);
    setUploadedUrl(null);
    setFileType("image");
    setVideoLink("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetState();
    onOpenChange(o);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `challenge-evidence/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("app-media").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(path);
      setUploadedUrl(urlData.publicUrl);
      setFileType(file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "file");
      if (file.type.startsWith("image")) {
        setPreviewUrl(URL.createObjectURL(file));
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoLinkChange = (url: string) => {
    setVideoLink(url);
    if (isValidVideoUrl(url)) {
      setUploadedUrl(url);
      setFileType("video_link");
      const ytId = extractYouTubeId(url);
      setPreviewUrl(ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
    } else {
      setUploadedUrl(null);
      setFileType("video_link");
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!uploadedUrl) return;
    try {
      await onSubmit({ taskId, fileUrl: uploadedUrl, fileType, notes: notes || undefined });
      resetState();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit evidence");
    }
  };

  const isReady = mode === "upload" ? !!uploadedUrl && !uploading : !!uploadedUrl && isValidVideoUrl(videoLink);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            Upload Evidence{taskTitle ? `: ${taskTitle}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as "upload" | "link"); setUploadedUrl(null); setPreviewUrl(null); setVideoLink(""); }}>
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Upload File
              </TabsTrigger>
              <TabsTrigger value="link" className="flex-1 gap-1.5">
                <Link className="h-3.5 w-3.5" /> Video Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-3 mt-3">
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              )}
              <div className="space-y-2">
                <Label>Screenshot / File *</Label>
                <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={handleFileSelect} />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading..." : uploadedUrl ? "Replace File" : "Choose File"}
                </Button>
                {uploadedUrl && !previewUrl && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> File uploaded
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="link" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Video URL *</Label>
                <Input
                  placeholder="Paste YouTube, Twitch, or video URL..."
                  value={videoLink}
                  onChange={(e) => handleVideoLinkChange(e.target.value)}
                />
                {videoLink && !isValidVideoUrl(videoLink) && (
                  <p className="text-xs text-destructive">Please enter a valid https:// URL</p>
                )}
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="Video thumbnail" className="w-full h-48 object-cover rounded-lg" />
              )}
              {uploadedUrl && !previewUrl && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Video link ready
                </p>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={!isReady} className="w-full">
            Submit Evidence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EvidenceUpload;
