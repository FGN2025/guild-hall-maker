import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2, Sparkles } from "lucide-react";

interface AiImageConfig {
  provider: "lovable" | "custom";
  model: string;
  custom_api_url: string;
  custom_api_key: string;
  custom_model: string;
}

const DEFAULT_CONFIG: AiImageConfig = {
  provider: "lovable",
  model: "google/gemini-3-pro-image-preview",
  custom_api_url: "",
  custom_api_key: "",
  custom_model: "",
};

const LOVABLE_MODELS = [
  { value: "google/gemini-3-pro-image-preview", label: "Gemini 3 Pro Image (Higher Quality, Default)" },
  { value: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (Faster, Lower Quality)" },
];

const MASKED_KEY = "••••••••••••••••";

interface Props {
  loading: boolean;
}

const AIImageConfigCard = ({ loading }: Props) => {
  const [config, setConfig] = useState<AiImageConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [keyChanged, setKeyChanged] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (loading) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ai_image_config")
        .maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value) as Partial<AiImageConfig>;
          const merged = { ...DEFAULT_CONFIG, ...parsed };
          if (merged.custom_api_key) {
            setHasExistingKey(true);
            merged.custom_api_key = MASKED_KEY;
          }
          setConfig(merged);
        } catch { /* keep defaults */ }
      }
    };
    fetch();
  }, [loading]);

  const handleSave = async () => {
    setSaving(true);
    const payload: AiImageConfig = { ...config };
    // If key wasn't changed, don't overwrite it — read existing and preserve
    if (!keyChanged && hasExistingKey) {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ai_image_config")
        .maybeSingle();
      if (data?.value) {
        try {
          const existing = JSON.parse(data.value);
          payload.custom_api_key = existing.custom_api_key || "";
        } catch { /* */ }
      }
    }

    const { error } = await supabase
      .from("app_settings")
      .update({ value: JSON.stringify(payload) })
      .eq("key", "ai_image_config");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "AI image configuration updated." });
      if (payload.custom_api_key && payload.custom_api_key !== MASKED_KEY) {
        setHasExistingKey(true);
        setConfig((c) => ({ ...c, custom_api_key: MASKED_KEY }));
        setKeyChanged(false);
      }
    }
    setSaving(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <Label className="font-heading text-sm">AI Image Generation</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Choose which AI provider and model to use for generating images (badges, trophies, etc.).
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <RadioGroup
            value={config.provider}
            onValueChange={(v) => setConfig((c) => ({ ...c, provider: v as "lovable" | "custom" }))}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="lovable" id="ai-lovable" />
              <Label htmlFor="ai-lovable" className="text-sm font-body cursor-pointer">
                Lovable AI (Built-in)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="custom" id="ai-custom" />
              <Label htmlFor="ai-custom" className="text-sm font-body cursor-pointer">
                Custom API
              </Label>
            </div>
          </RadioGroup>

          {config.provider === "lovable" && (
            <div className="space-y-2">
              <Label className="text-xs font-heading text-muted-foreground">Model</Label>
              <Select
                value={config.model}
                onValueChange={(v) => setConfig((c) => ({ ...c, model: v }))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOVABLE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {config.provider === "custom" && (
            <div className="space-y-3 pl-1 border-l-2 border-primary/20 ml-1 pl-4">
              <div className="space-y-1">
                <Label className="text-xs font-heading text-muted-foreground">API Endpoint URL</Label>
                <Input
                  value={config.custom_api_url}
                  onChange={(e) => setConfig((c) => ({ ...c, custom_api_url: e.target.value }))}
                  placeholder="https://api.example.com/v1/chat/completions"
                  className="bg-background border-border font-body text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-heading text-muted-foreground">API Key</Label>
                <PasswordInput
                  value={config.custom_api_key}
                  onChange={(e) => {
                    setKeyChanged(true);
                    setConfig((c) => ({ ...c, custom_api_key: e.target.value }));
                  }}
                  onFocus={() => {
                    if (config.custom_api_key === MASKED_KEY) {
                      setConfig((c) => ({ ...c, custom_api_key: "" }));
                      setKeyChanged(true);
                    }
                  }}
                  placeholder="sk-..."
                  className="bg-background border-border font-body text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-heading text-muted-foreground">Model Name</Label>
                <Input
                  value={config.custom_model}
                  onChange={(e) => setConfig((c) => ({ ...c, custom_model: e.target.value }))}
                  placeholder="dall-e-3"
                  className="bg-background border-border font-body text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || loading} className="font-heading">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );
};

export default AIImageConfigCard;
