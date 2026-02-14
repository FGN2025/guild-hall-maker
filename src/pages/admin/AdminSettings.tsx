import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Settings, Save, Loader2 } from "lucide-react";

const AdminSettings = () => {
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const [msgRes, vidRes] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "no_providers_message").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "featured_video_url").maybeSingle(),
      ]);
      setMessage(msgRes.data?.value ?? "");
      setVideoUrl(vidRes.data?.value ?? "");
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: message })
      .eq("key", "no_providers_message");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "No-providers message updated." });
    }
    setSaving(false);
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: videoUrl })
      .eq("key", "featured_video_url");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Featured video URL updated." });
    }
    setSavingVideo(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="noProvidersMsg" className="font-heading text-sm">
            No-Providers Message
          </Label>
          <p className="text-xs text-muted-foreground">
            Shown to users when their ZIP code is valid but no providers serve their area.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <Textarea
              id="noProvidersMsg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="bg-background border-border font-body"
            />
          )}
        </div>

        <Button onClick={handleSave} disabled={saving || loading} className="font-heading">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="featuredVideoUrl" className="font-heading text-sm">
            Featured Video URL
          </Label>
          <p className="text-xs text-muted-foreground">
            YouTube video embedded on the home page. Paste a youtu.be or youtube.com link.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <Input
              id="featuredVideoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtu.be/..."
              className="bg-background border-border font-body"
            />
          )}
        </div>

        <Button onClick={handleSaveVideo} disabled={savingVideo || loading} className="font-heading">
          {savingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
