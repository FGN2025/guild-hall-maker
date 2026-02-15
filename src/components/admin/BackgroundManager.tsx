import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Sparkles, ImageIcon, Upload } from "lucide-react";
import { useAllPageBackgrounds, useUpsertPageBackground, type PageBackground } from "@/hooks/usePageBackground";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRef } from "react";

const PAGES = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "leaderboard", label: "Leaderboard" },
  { slug: "community", label: "Community" },
  { slug: "achievements", label: "Achievements" },
  { slug: "season-stats", label: "Season Stats" },
];

interface PageRowState {
  image_url: string;
  opacity: number;
}

const BackgroundManager = () => {
  const { data: backgrounds, isLoading } = useAllPageBackgrounds();
  const upsert = useUpsertPageBackground();
  const [state, setState] = useState<Record<string, PageRowState>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  useEffect(() => {
    if (!backgrounds) return;
    const initial: Record<string, PageRowState> = {};
    PAGES.forEach((p) => {
      const existing = backgrounds.find((b) => b.page_slug === p.slug);
      initial[p.slug] = {
        image_url: existing?.image_url ?? "",
        opacity: existing?.opacity ?? 0.15,
      };
    });
    setState(initial);
  }, [backgrounds]);

  const handleSave = (slug: string) => {
    const s = state[slug];
    if (!s?.image_url) {
      toast.error("Enter an image URL first");
      return;
    }
    upsert.mutate({ page_slug: slug, image_url: s.image_url, opacity: s.opacity });
  };

  const handleGenerate = async (slug: string, label: string) => {
    setGenerating(slug);
    try {
      const prompt = `Dark cyberpunk gaming background with neon cyan accents, abstract digital patterns, circuit board traces, and futuristic grid elements. Suitable as a subtle full-page background for a ${label} page. Ultra high resolution, 16:9 aspect ratio.`;
      const { data, error } = await supabase.functions.invoke("generate-media-image", {
        body: { prompt, category: "banner", tags: ["background", "cyberpunk", slug] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data.media?.url;
      if (url) {
        setState((prev) => ({ ...prev, [slug]: { ...prev[slug], image_url: url } }));
        toast.success("Image generated! Click Save to apply.");
      }
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(null);
    }
  };

  const handleFileUpload = async (slug: string, file: File) => {
    setUploading(slug);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const filePath = `banner/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("app-media").upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(filePath);
      setState((prev) => ({ ...prev, [slug]: { ...prev[slug], image_url: urlData.publicUrl } }));
      toast.success("Image uploaded! Click Save to apply.");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const updateField = (slug: string, field: keyof PageRowState, value: string | number) => {
    setState((prev) => ({ ...prev, [slug]: { ...prev[slug], [field]: value } }));
  };

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Page Backgrounds
        </CardTitle>
        <CardDescription className="font-body">
          Assign full-page background images with adjustable opacity. Generate cyberpunk-themed backgrounds with AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {PAGES.map((page) => {
          const s = state[page.slug] ?? { image_url: "", opacity: 0.15 };
          const isGen = generating === page.slug;
          return (
            <div key={page.slug} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-semibold text-foreground">{page.label}</h4>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={(el) => { fileInputRefs.current[page.slug] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(page.slug, file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading !== null || generating !== null}
                    onClick={() => fileInputRefs.current[page.slug]?.click()}
                    className="gap-1.5 font-heading"
                  >
                    {uploading === page.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isGen || generating !== null || uploading !== null}
                    onClick={() => handleGenerate(page.slug, page.label)}
                    className="gap-1.5 font-heading"
                  >
                    {isGen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Generate AI
                  </Button>
                  <Button
                    size="sm"
                    disabled={upsert.isPending || !s.image_url}
                    onClick={() => handleSave(page.slug)}
                    className="gap-1.5 font-heading"
                  >
                    {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                {s.image_url && (
                  <div className="w-24 h-14 rounded border border-border overflow-hidden shrink-0">
                    <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <Input
                    value={s.image_url}
                    onChange={(e) => updateField(page.slug, "image_url", e.target.value)}
                    placeholder="Image URL from media library..."
                    className="bg-background border-border font-body text-sm"
                  />
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground font-heading shrink-0 w-16">
                      Opacity: {Math.round(s.opacity * 100)}%
                    </Label>
                    <Slider
                      value={[s.opacity]}
                      onValueChange={([v]) => updateField(page.slug, "opacity", v)}
                      min={0.05}
                      max={0.5}
                      step={0.01}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default BackgroundManager;
