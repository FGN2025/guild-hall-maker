import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface EvidenceUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  taskTitle?: string;
  onSubmit: (data: { taskId?: string; fileUrl: string; fileType: string; notes?: string }) => Promise<void>;
}

const EvidenceUpload = ({ open, onOpenChange, taskId, taskTitle, onSubmit }: EvidenceUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState("image");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async () => {
    if (!uploadedUrl) return;
    try {
      await onSubmit({ taskId, fileUrl: uploadedUrl, fileType, notes: notes || undefined });
      setNotes("");
      setPreviewUrl(null);
      setUploadedUrl(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit evidence");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            Upload Evidence{taskTitle ? `: ${taskTitle}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
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

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={!uploadedUrl || uploading} className="w-full">
            Submit Evidence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EvidenceUpload;
