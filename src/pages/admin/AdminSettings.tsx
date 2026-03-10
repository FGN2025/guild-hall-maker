import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, ImageIcon, Code, FileText, BarChart3 } from "lucide-react";
import { exportReadmePdf, exportArchitecturePdf } from "@/lib/exportDocuments";
import { IMAGE_PRESETS } from "@/lib/imageValidation";
import { Checkbox } from "@/components/ui/checkbox";
import HeroLogoSettings from "@/components/admin/HeroLogoSettings";
import AIImageConfigCard from "@/components/admin/AIImageConfigCard";
import CalendarPublishManager from "@/components/admin/CalendarPublishManager";

interface LimitEntry {
  enabled: boolean;
  maxSizeKB: number;
  minWidth?: number;
  minHeight?: number;
}

const PRESET_LABELS: Record<string, string> = {
  cardCover: "Card Cover (games, prizes)",
  heroBanner: "Hero Banner",
  tournamentHero: "Tournament Hero",
  avatar: "Avatar / Logo",
  general: "General Upload",
};

const PRESET_KEYS = ["cardCover", "heroBanner", "tournamentHero", "avatar", "general"] as const;

function getDefaults(): Record<string, LimitEntry> {
  const out: Record<string, LimitEntry> = {};
  for (const k of PRESET_KEYS) {
    const p = IMAGE_PRESETS[k];
    out[k] = { enabled: true, maxSizeKB: p.maxSizeKB, minWidth: p.minWidth, minHeight: p.minHeight };
  }
  return out;
}

const AdminSettings = () => {
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tickerEmbed, setTickerEmbed] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [savingTicker, setSavingTicker] = useState(false);

  // Image limits
  const [imgLimits, setImgLimits] = useState<Record<string, LimitEntry>>(getDefaults());
  const [savingImg, setSavingImg] = useState(false);
  const [heroLogoUrl, setHeroLogoUrl] = useState("");

  // Hero stats overrides
  const [heroPlayers, setHeroPlayers] = useState("");
  const [heroTournaments, setHeroTournaments] = useState("");
  const [heroOperators, setHeroOperators] = useState("");
  const [savingStats, setSavingStats] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const [msgRes, vidRes, imgRes, tickerRes, heroRes, statsRes] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "no_providers_message").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "featured_video_url").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "image_upload_limits").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "homepage_ticker_embed").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "hero_logo_url").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "hero_stats_overrides").maybeSingle(),
      ]);
      setMessage(msgRes.data?.value ?? "");
      setVideoUrl(vidRes.data?.value ?? "");
      setTickerEmbed(tickerRes.data?.value ?? "");
      setHeroLogoUrl(heroRes.data?.value ?? "");
      if (statsRes.data?.value) {
        try {
          const parsed = JSON.parse(statsRes.data.value);
          setHeroPlayers(parsed.players != null ? String(parsed.players) : "");
          setHeroTournaments(parsed.tournaments != null ? String(parsed.tournaments) : "");
          setHeroOperators(parsed.operators != null ? String(parsed.operators) : "");
        } catch {}
      }
      if (imgRes.data?.value) {
        try {
          const parsed = JSON.parse(imgRes.data.value);
          setImgLimits({ ...getDefaults(), ...parsed });
        } catch { /* keep defaults */ }
      }
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

  const handleSaveTicker = async () => {
    setSavingTicker(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: tickerEmbed })
      .eq("key", "homepage_ticker_embed");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Homepage ticker embed updated." });
    }
    setSavingTicker(false);
  };

  const updateLimit = (preset: string, field: keyof LimitEntry, value: string) => {
    const num = value === "" ? undefined : parseInt(value);
    setImgLimits((prev) => ({
      ...prev,
      [preset]: { ...prev[preset], [field]: num },
    }));
  };

  const handleSaveImgLimits = async () => {
    setSavingImg(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: JSON.stringify(imgLimits) })
      .eq("key", "image_upload_limits");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Image upload limits updated." });
    }
    setSavingImg(false);
  };

  const handleResetImgLimits = () => {
    setImgLimits(getDefaults());
  };

  const handleSaveHeroStats = async () => {
    setSavingStats(true);
    const overrides = {
      players: heroPlayers !== "" ? parseInt(heroPlayers) : null,
      tournaments: heroTournaments !== "" ? parseInt(heroTournaments) : null,
      operators: heroOperators !== "" ? parseInt(heroOperators) : null,
    };
    const { error } = await supabase
      .from("app_settings")
      .update({ value: JSON.stringify(overrides) })
      .eq("key", "hero_stats_overrides");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Home page stats updated." });
    }
    setSavingStats(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
      </div>

      {/* No-Providers Message */}
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

      {/* Featured Video */}
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

      {/* Hero Logo */}
      <HeroLogoSettings
        currentUrl={heroLogoUrl}
        loading={loading}
        onSaved={(url) => setHeroLogoUrl(url)}
      />

      {/* Home Page Stats */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Home Page Stats</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Override the hero stats shown on the home page. Leave a field blank to use the live database count.
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="heroPlayers" className="text-xs font-body">Players</Label>
              <Input
                id="heroPlayers"
                type="number"
                min={0}
                value={heroPlayers}
                onChange={(e) => setHeroPlayers(e.target.value)}
                placeholder="Live count"
                className="bg-background border-border font-body"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="heroTournaments" className="text-xs font-body">Tournaments</Label>
              <Input
                id="heroTournaments"
                type="number"
                min={0}
                value={heroTournaments}
                onChange={(e) => setHeroTournaments(e.target.value)}
                placeholder="Live count"
                className="bg-background border-border font-body"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="heroOperators" className="text-xs font-body">Operators Served</Label>
              <Input
                id="heroOperators"
                type="number"
                min={0}
                value={heroOperators}
                onChange={(e) => setHeroOperators(e.target.value)}
                placeholder="Live count"
                className="bg-background border-border font-body"
              />
            </div>
          </div>
        )}
        <Button onClick={handleSaveHeroStats} disabled={savingStats || loading} className="font-heading">
          {savingStats ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Stats
        </Button>
      </div>

      {/* Homepage Ticker Embed */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            <Label htmlFor="tickerEmbed" className="font-heading text-sm">
              Homepage Ticker Embed
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Raw HTML/script embed code displayed between the Hero section and Featured Video on the homepage. Leave empty to hide.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <Textarea
              id="tickerEmbed"
              value={tickerEmbed}
              onChange={(e) => setTickerEmbed(e.target.value)}
              rows={4}
              placeholder='<div class="commonninja_component pid-..."></div>'
              className="bg-background border-border font-mono text-xs"
            />
          )}
        </div>
        <Button onClick={handleSaveTicker} disabled={savingTicker || loading} className="font-heading">
          {savingTicker ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* AI Image Generation */}
      <AIImageConfigCard loading={loading} />

      {/* Image Upload Limits */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Image Upload Limits</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure maximum file size and minimum dimensions for each image upload context. Changes apply immediately to all upload forms.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-3 text-xs font-heading text-muted-foreground">
              <div>On</div>
              <div>Preset</div>
              <div>Max Size (KB)</div>
              <div>Min Width (px)</div>
              <div>Min Height (px)</div>
            </div>

            {PRESET_KEYS.map((key) => {
              const entry: LimitEntry = imgLimits[key] ?? { enabled: true, maxSizeKB: 500 };
              const disabled = !entry.enabled;
              return (
                <div key={key} className={`grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-3 items-center ${disabled ? "opacity-50" : ""}`}>
                  <Checkbox
                    checked={entry.enabled}
                    onCheckedChange={(checked) =>
                      setImgLimits((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], enabled: !!checked },
                      }))
                    }
                  />
                  <Label className="text-xs font-body text-foreground truncate" title={PRESET_LABELS[key]}>
                    {PRESET_LABELS[key]}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={entry.maxSizeKB ?? ""}
                    onChange={(e) => updateLimit(key, "maxSizeKB", e.target.value)}
                    disabled={disabled}
                    className="bg-background border-border font-body text-sm h-8"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={entry.minWidth ?? ""}
                    onChange={(e) => updateLimit(key, "minWidth", e.target.value)}
                    disabled={disabled}
                    placeholder="—"
                    className="bg-background border-border font-body text-sm h-8"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={entry.minHeight ?? ""}
                    onChange={(e) => updateLimit(key, "minHeight", e.target.value)}
                    disabled={disabled}
                    placeholder="—"
                    className="bg-background border-border font-body text-sm h-8"
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSaveImgLimits} disabled={savingImg || loading} className="font-heading">
            {savingImg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Limits
          </Button>
          <Button variant="outline" onClick={handleResetImgLimits} disabled={loading} className="font-heading">
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Calendar Publish */}
      <div className="rounded-lg border border-border bg-card p-6">
        <CalendarPublishManager />
      </div>

      {/* Documentation Downloads */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Documentation</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Download formatted PDF versions of the platform documentation for offline reference or sharing.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportReadmePdf} className="font-heading">
            <FileText className="h-4 w-4 mr-2" />
            Download README (PDF)
          </Button>
          <Button variant="outline" onClick={exportArchitecturePdf} className="font-heading">
            <FileText className="h-4 w-4 mr-2" />
            Download Architecture Guide (PDF)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
