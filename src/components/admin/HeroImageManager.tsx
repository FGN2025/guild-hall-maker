import { useState, useEffect } from "react";
import { useAllPageHeroes, useUpsertPageHero, type PageHeroImage } from "@/hooks/usePageHero";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Save, Loader2 } from "lucide-react";

const ASSIGNABLE_PAGES = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "tournaments", label: "Tournaments" },
  { slug: "leaderboard", label: "Leaderboard" },
  { slug: "community", label: "Community" },
  { slug: "achievements", label: "Achievements" },
  { slug: "season-stats", label: "Season Stats" },
] as const;

const HeroImageManager = () => {
  const { data: heroes } = useAllPageHeroes();
  const { media } = useMediaLibrary("all");
  const upsert = useUpsertPageHero();

  const [drafts, setDrafts] = useState<Record<string, { image_url: string; title: string; subtitle: string }>>({});

  // Seed drafts from existing DB data
  useEffect(() => {
    if (!heroes) return;
    const map: typeof drafts = {};
    heroes.forEach((h) => {
      map[h.page_slug] = { image_url: h.image_url, title: h.title ?? "", subtitle: h.subtitle ?? "" };
    });
    setDrafts((prev) => ({ ...map, ...prev }));
  }, [heroes]);

  const getDraft = (slug: string) => drafts[slug] ?? { image_url: "", title: "", subtitle: "" };

  const updateDraft = (slug: string, field: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [slug]: { ...getDraft(slug), [field]: value },
    }));
  };

  const imageOptions = media.filter((m) => m.file_type === "image");

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Page Hero Images
        </CardTitle>
        <CardDescription className="font-body">
          Assign a hero banner image, title, and subtitle to each page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ASSIGNABLE_PAGES.map(({ slug, label }) => {
          const draft = getDraft(slug);
          return (
            <div key={slug} className="rounded-lg border border-border p-4 space-y-3">
              <h4 className="font-heading font-semibold text-foreground">{label}</h4>

              <div className="flex flex-col md:flex-row gap-4">
                {draft.image_url && (
                  <div className="w-full md:w-40 h-24 rounded-md overflow-hidden border border-border shrink-0">
                    <img src={draft.image_url} alt={`${label} hero`} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Image (select from library or paste URL)</Label>
                    <div className="flex gap-2 mt-1">
                      <Select
                        value={imageOptions.some((m) => m.url === draft.image_url) ? draft.image_url : ""}
                        onValueChange={(v) => updateDraft(slug, "image_url", v)}
                      >
                        <SelectTrigger className="flex-1 bg-background border-border text-sm">
                          <span className="truncate">{draft.image_url ? "Selected" : "Choose from library…"}</span>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {imageOptions.map((m) => (
                            <SelectItem key={m.id} value={m.url}>
                              {m.file_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={draft.image_url}
                      onChange={(e) => updateDraft(slug, "image_url", e.target.value)}
                      placeholder="Or paste image URL…"
                      className="mt-1 bg-background border-border text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Title (optional)</Label>
                      <Input
                        value={draft.title}
                        onChange={(e) => updateDraft(slug, "title", e.target.value)}
                        placeholder="Hero title"
                        className="bg-background border-border text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Subtitle (optional)</Label>
                      <Input
                        value={draft.subtitle}
                        onChange={(e) => updateDraft(slug, "subtitle", e.target.value)}
                        placeholder="Hero subtitle"
                        className="bg-background border-border text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={!draft.image_url || upsert.isPending}
                    onClick={() =>
                      upsert.mutate({
                        page_slug: slug,
                        image_url: draft.image_url,
                        title: draft.title || null,
                        subtitle: draft.subtitle || null,
                      })
                    }
                    className="font-heading"
                  >
                    {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default HeroImageManager;
