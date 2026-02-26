import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ImageIcon, Upload, Loader2, RotateCcw } from "lucide-react";
import defaultLogo from "@/assets/fgn-hero-logo.png";

interface Props {
  currentUrl: string;
  loading: boolean;
  onSaved: (newUrl: string) => void;
}

const HeroLogoSettings = ({ currentUrl, loading, onSaved }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayUrl = currentUrl || defaultLogo;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop() ?? "png";
    const path = `hero/logo.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("app-media")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: saveErr } = await supabase
      .from("app_settings")
      .update({ value: publicUrl })
      .eq("key", "hero_logo_url");

    if (saveErr) {
      toast({ title: "Error", description: saveErr.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Hero logo updated." });
      onSaved(publicUrl);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReset = async () => {
    setResetting(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: "" })
      .eq("key", "hero_logo_url");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reset", description: "Hero logo reset to default." });
      onSaved("");
    }
    setResetting(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-primary" />
        <Label className="font-heading text-sm">Hero Logo</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Logo displayed above "Network Gaming Platform" in the homepage hero. Upload a new image or reset to the default.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <img
              src={displayUrl}
              alt="Current hero logo"
              className="max-h-16 rounded border border-border bg-background p-2 object-contain"
            />
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="font-heading"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Logo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={resetting || !currentUrl}
                className="font-heading"
              >
                {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Reset to Default
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HeroLogoSettings;
