import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Image, Save, Loader2, Sparkles, Upload, Trash2, ChevronDown, Plus, Paintbrush,
} from "lucide-react";
import { useAllManagedPages, useAddManagedPage, useDeleteManagedPage, type ManagedPage } from "@/hooks/useManagedPages";
import { useAllPageHeroes, useUpsertPageHero } from "@/hooks/usePageHero";
import { useAllPageBackgrounds, useUpsertPageBackground, useDeletePageBackground } from "@/hooks/usePageBackground";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Add Page Form ──────────────────────────────────────────────
const AddPageForm = () => {
  const addPage = useAddManagedPage();
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [hero, setHero] = useState(true);
  const [bg, setBg] = useState(true);

  const handleSubmit = () => {
    const trimSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimSlug || !label.trim()) {
      toast.error("Slug and label are required");
      return;
    }
    addPage.mutate({ slug: trimSlug, label: label.trim(), supports_hero: hero, supports_background: bg });
    setSlug("");
    setLabel("");
    setHero(true);
    setBg(true);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-4 mb-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. stats" className="w-36 bg-background border-border text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Label</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Stats" className="w-40 bg-background border-border text-sm" />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="add-hero" checked={hero} onCheckedChange={(v) => setHero(!!v)} />
        <Label htmlFor="add-hero" className="text-xs">Hero</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="add-bg" checked={bg} onCheckedChange={(v) => setBg(!!v)} />
        <Label htmlFor="add-bg" className="text-xs">Background</Label>
      </div>
      <Button size="sm" disabled={addPage.isPending} onClick={handleSubmit} className="font-heading gap-1.5">
        {addPage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Add Page
      </Button>
    </div>
  );
};

// ── Hero Sub-section ───────────────────────────────────────────
interface HeroProps {
  slug: string;
  draft: { image_url: string; title: string; subtitle: string };
  onUpdate: (field: string, value: string) => void;
  imageOptions: { id: string; url: string; file_name: string }[];
  onSave: () => void;
  saving: boolean;
}

const HeroSubSection = ({ slug, draft, onUpdate, imageOptions, onSave, saving }: HeroProps) => (
  <div className="space-y-3">
    <h5 className="text-sm font-heading font-semibold text-muted-foreground flex items-center gap-1.5">
      <Image className="h-4 w-4" /> Hero Banner
    </h5>
    {draft.image_url && (
      <div className="w-full h-24 rounded-md overflow-hidden border border-border">
        <img src={draft.image_url} alt="hero preview" className="w-full h-full object-cover" />
      </div>
    )}
    <div>
      <Label className="text-xs text-muted-foreground">Image (select or paste URL)</Label>
      <Select
        value={imageOptions.some((m) => m.url === draft.image_url) ? draft.image_url : ""}
        onValueChange={(v) => onUpdate("image_url", v)}
      >
        <SelectTrigger className="bg-background border-border text-sm mt-1">
          <span className="truncate">{draft.image_url ? "Selected" : "Choose from library…"}</span>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {imageOptions.map((m) => (
            <SelectItem key={m.id} value={m.url}>{m.file_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input value={draft.image_url} onChange={(e) => onUpdate("image_url", e.target.value)} placeholder="Or paste image URL…" className="mt-1 bg-background border-border text-sm" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div>
        <Label className="text-xs text-muted-foreground">Title</Label>
        <Input value={draft.title} onChange={(e) => onUpdate("title", e.target.value)} placeholder="Hero title" className="bg-background border-border text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Subtitle</Label>
        <Input value={draft.subtitle} onChange={(e) => onUpdate("subtitle", e.target.value)} placeholder="Hero subtitle" className="bg-background border-border text-sm" />
      </div>
    </div>
    <Button size="sm" disabled={!draft.image_url || saving} onClick={onSave} className="font-heading gap-1.5">
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save Hero
    </Button>
  </div>
);

// ── Background Sub-section ─────────────────────────────────────
interface BgProps {
  slug: string;
  label: string;
  draft: { image_url: string; opacity: number };
  onUpdate: (field: string, value: string | number) => void;
  onSave: () => void;
  onClear: () => void;
  saving: boolean;
  clearing: boolean;
}

const BackgroundSubSection = ({ slug, label, draft, onUpdate, onSave, onClear, saving, clearing }: BgProps) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const prompt = `Dark cyberpunk gaming background with neon cyan accents, abstract digital patterns, circuit board traces, and futuristic grid elements. Suitable as a subtle full-page background for a ${label} page. Ultra high resolution, 16:9 aspect ratio.`;
      const { data, error } = await supabase.functions.invoke("generate-media-image", {
        body: { prompt, category: "banner", tags: ["background", "cyberpunk", slug] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.media?.url) {
        onUpdate("image_url", data.media.url);
        toast.success("Image generated! Click Save to apply.");
      }
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const filePath = `banner/${fileName}`;
      const { error } = await supabase.storage.from("app-media").upload(filePath, file, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(filePath);
      onUpdate("image_url", urlData.publicUrl);
      toast.success("Uploaded! Click Save to apply.");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const busy = generating || uploading;

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-heading font-semibold text-muted-foreground flex items-center gap-1.5">
        <Paintbrush className="h-4 w-4" /> Background
      </h5>
      <div className="flex gap-2 flex-wrap">
        <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()} className="gap-1.5 font-heading">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={handleGenerate} className="gap-1.5 font-heading">
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate AI
        </Button>
      </div>
      {draft.image_url && (
        <div className="w-full h-14 rounded border border-border overflow-hidden">
          <img src={draft.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <Input value={draft.image_url} onChange={(e) => onUpdate("image_url", e.target.value)} placeholder="Image URL…" className="bg-background border-border text-sm" />
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground font-heading shrink-0 w-16">Opacity: {Math.round(draft.opacity * 100)}%</Label>
        <Slider value={[draft.opacity]} onValueChange={([v]) => onUpdate("opacity", v)} min={0.05} max={0.5} step={0.01} className="flex-1" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!draft.image_url || saving} onClick={onSave} className="gap-1.5 font-heading">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </Button>
        {draft.image_url && (
          <Button variant="destructive" size="sm" disabled={clearing} onClick={onClear} className="gap-1.5 font-heading">
            {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Clear
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────
const PageAppearanceManager = () => {
  const { data: pages, isLoading: pagesLoading } = useAllManagedPages();
  const { data: heroes } = useAllPageHeroes();
  const { data: backgrounds } = useAllPageBackgrounds();
  const { media } = useMediaLibrary("all");
  const upsertHero = useUpsertPageHero();
  const upsertBg = useUpsertPageBackground();
  const deleteBg = useDeletePageBackground();
  const deletePage = useDeleteManagedPage();

  const [heroDrafts, setHeroDrafts] = useState<Record<string, { image_url: string; title: string; subtitle: string }>>({});
  const [bgDrafts, setBgDrafts] = useState<Record<string, { image_url: string; opacity: number }>>({});

  useEffect(() => {
    if (!heroes) return;
    const m: typeof heroDrafts = {};
    heroes.forEach((h) => { m[h.page_slug] = { image_url: h.image_url, title: h.title ?? "", subtitle: h.subtitle ?? "" }; });
    setHeroDrafts((prev) => ({ ...m, ...prev }));
  }, [heroes]);

  useEffect(() => {
    if (!backgrounds) return;
    const m: typeof bgDrafts = {};
    backgrounds.forEach((b) => { m[b.page_slug] = { image_url: b.image_url, opacity: b.opacity }; });
    setBgDrafts((prev) => ({ ...m, ...prev }));
  }, [backgrounds]);

  const getHeroDraft = (slug: string) => heroDrafts[slug] ?? { image_url: "", title: "", subtitle: "" };
  const getBgDraft = (slug: string) => bgDrafts[slug] ?? { image_url: "", opacity: 0.25 };

  const updateHeroDraft = (slug: string, field: string, value: string) => {
    setHeroDrafts((prev) => ({ ...prev, [slug]: { ...getHeroDraft(slug), [field]: value } }));
  };
  const updateBgDraft = (slug: string, field: string, value: string | number) => {
    setBgDrafts((prev) => ({ ...prev, [slug]: { ...getBgDraft(slug), [field]: value } }));
  };

  const imageOptions = media.filter((m) => m.file_type === "image");

  if (pagesLoading) {
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
          <Paintbrush className="h-5 w-5 text-primary" />
          Page Appearance
        </CardTitle>
        <CardDescription className="font-body">
          Manage hero banners and background images for each page. Add new pages below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddPageForm />

        {(pages ?? []).map((page) => (
          <Collapsible key={page.id} defaultOpen={false}>
            <div className="rounded-lg border border-border">
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg text-left">
                  <span className="font-heading font-semibold text-foreground">{page.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">/{page.slug}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {page.supports_hero && (
                    <HeroSubSection
                      slug={page.slug}
                      draft={getHeroDraft(page.slug)}
                      onUpdate={(f, v) => updateHeroDraft(page.slug, f, v)}
                      imageOptions={imageOptions}
                      onSave={() => {
                        const d = getHeroDraft(page.slug);
                        upsertHero.mutate({ page_slug: page.slug, image_url: d.image_url, title: d.title || null, subtitle: d.subtitle || null });
                      }}
                      saving={upsertHero.isPending}
                    />
                  )}
                  {page.supports_background && (
                    <BackgroundSubSection
                      slug={page.slug}
                      label={page.label}
                      draft={getBgDraft(page.slug)}
                      onUpdate={(f, v) => updateBgDraft(page.slug, f, v)}
                      onSave={() => {
                        const d = getBgDraft(page.slug);
                        if (!d.image_url) { toast.error("Enter an image URL first"); return; }
                        upsertBg.mutate({ page_slug: page.slug, image_url: d.image_url, opacity: d.opacity });
                      }}
                      onClear={() => {
                        deleteBg.mutate(page.slug);
                        setBgDrafts((prev) => ({ ...prev, [page.slug]: { image_url: "", opacity: 0.25 } }));
                      }}
                      saving={upsertBg.isPending}
                      clearing={deleteBg.isPending}
                    />
                  )}
                </div>
                <div className="px-4 pb-4 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-destructive gap-1.5 font-heading" disabled={deletePage.isPending} onClick={() => deletePage.mutate(page.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove Page
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
};

export default PageAppearanceManager;
