import { useState } from "react";
import { WebPageSection } from "@/hooks/useWebPages";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Image, Plus, Trash2, Code2 } from "lucide-react";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import type { MediaItem } from "@/hooks/useMediaLibrary";

interface Props {
  section: WebPageSection;
  onUpdate: (config: Record<string, any>) => void;
}

const SectionEditor = ({ section, onUpdate }: Props) => {
  const c = section.config;
  const [mediaPicker, setMediaPicker] = useState<{ open: boolean; field: string }>({ open: false, field: "" });

  const set = (key: string, value: any) => onUpdate({ ...c, [key]: value });

  const openPicker = (field: string) => setMediaPicker({ open: true, field });

  const handleMediaSelect = (url: string) => {
    set(mediaPicker.field, url);
  };

  const UrlField = ({ label, field }: { label: string; field: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-heading">{label}</Label>
      <div className="flex gap-2">
        <Input value={c[field] || ""} onChange={(e) => set(field, e.target.value)} placeholder="https://..." className="flex-1 text-sm" />
        <Button type="button" variant="outline" size="icon" onClick={() => openPicker(field)} title="Pick from Media Library">
          <Image className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  switch (section.section_type) {
    case "hero":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Heading</Label>
            <Input value={c.heading || ""} onChange={(e) => set("heading", e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Subheading</Label>
            <Input value={c.subheading || ""} onChange={(e) => set("subheading", e.target.value)} className="text-sm" />
          </div>
          <UrlField label="Background Image" field="image_url" />
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Overlay Opacity ({Math.round((c.overlay_opacity ?? 0.5) * 100)}%)</Label>
            <Slider value={[c.overlay_opacity ?? 0.5]} onValueChange={([v]) => set("overlay_opacity", v)} min={0} max={1} step={0.05} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-heading">CTA Text</Label>
              <Input value={c.cta_text || ""} onChange={(e) => set("cta_text", e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-heading">CTA URL</Label>
              <Input value={c.cta_url || ""} onChange={(e) => set("cta_url", e.target.value)} className="text-sm" />
            </div>
          </div>
          <MediaPickerDialog open={mediaPicker.open} onOpenChange={(o) => setMediaPicker({ ...mediaPicker, open: o })} onSelect={handleMediaSelect} />
        </div>
      );

    case "text_block":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Heading</Label>
            <Input value={c.heading || ""} onChange={(e) => set("heading", e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Body (Markdown)</Label>
            <Textarea value={c.body || ""} onChange={(e) => set("body", e.target.value)} rows={6} className="text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Alignment</Label>
            <Select value={c.alignment || "left"} onValueChange={(v) => set("alignment", v)}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "image_gallery": {
      const items = (c.items || []) as { image_url: string; caption?: string }[];
      return (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start border border-border rounded-lg p-2">
              <div className="flex-1 space-y-1.5">
                <div className="flex gap-2">
                  <Input value={item.image_url} onChange={(e) => {
                    const updated = [...items];
                    updated[i] = { ...item, image_url: e.target.value };
                    set("items", updated);
                  }} placeholder="Image URL" className="text-sm flex-1" />
                  <Button type="button" variant="outline" size="icon" onClick={() => {
                    setMediaPicker({ open: true, field: `gallery_${i}` });
                  }}><Image className="h-4 w-4" /></Button>
                </div>
                <Input value={item.caption || ""} onChange={(e) => {
                  const updated = [...items];
                  updated[i] = { ...item, caption: e.target.value };
                  set("items", updated);
                }} placeholder="Caption (optional)" className="text-sm" />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => set("items", items.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set("items", [...items, { image_url: "", caption: "" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add Image
          </Button>
          <MediaPickerDialog
            open={mediaPicker.open}
            onOpenChange={(o) => setMediaPicker({ ...mediaPicker, open: o })}
            onSelect={(url) => {
              const idx = parseInt(mediaPicker.field.replace("gallery_", ""));
              if (!isNaN(idx)) {
                const updated = [...items];
                updated[idx] = { ...updated[idx], image_url: url };
                set("items", updated);
              }
            }}
          />
        </div>
      );
    }

    case "cta":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Heading</Label>
            <Input value={c.heading || ""} onChange={(e) => set("heading", e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Body</Label>
            <Textarea value={c.body || ""} onChange={(e) => set("body", e.target.value)} rows={3} className="text-sm" />
          </div>
          <UrlField label="Image" field="image_url" />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-heading">Button Text</Label>
              <Input value={c.button_text || ""} onChange={(e) => set("button_text", e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-heading">Button URL</Label>
              <Input value={c.button_url || ""} onChange={(e) => set("button_url", e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Background Color</Label>
            <Input value={c.background_color || ""} onChange={(e) => set("background_color", e.target.value)} placeholder="e.g. #1a1a2e" className="text-sm" />
          </div>
          <MediaPickerDialog open={mediaPicker.open} onOpenChange={(o) => setMediaPicker({ ...mediaPicker, open: o })} onSelect={handleMediaSelect} />
        </div>
      );

    case "embed_widget":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Label</Label>
            <Input value={c.label || ""} onChange={(e) => set("label", e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-heading">Embed Code (HTML)</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => openPicker("embed_widget_pick")} className="gap-1.5">
                <Code2 className="h-3.5 w-3.5" /> Pick from Widget Library
              </Button>
            </div>
            <Textarea value={c.embed_code || ""} onChange={(e) => set("embed_code", e.target.value)} rows={6} className="text-sm font-mono" />
          </div>
          <MediaPickerDialog
            open={mediaPicker.open && mediaPicker.field === "embed_widget_pick"}
            onOpenChange={(o) => setMediaPicker({ ...mediaPicker, open: o })}
            initialTab="widget"
            onSelect={(_url, _fp, item?: MediaItem) => {
              if (item?.embed_code) {
                onUpdate({ ...c, embed_code: item.embed_code, thumbnail_url: item.url, label: c.label || item.file_name });
              }
            }}
          />
          {c.thumbnail_url && (
            <div className="space-y-1.5">
              <Label className="text-xs font-heading">Widget Thumbnail</Label>
              <div className="relative inline-block">
                <img src={c.thumbnail_url} alt="Widget thumbnail" className="h-20 rounded-md border border-border object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5"
                  onClick={() => set("thumbnail_url", "")}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      );

    case "banner":
      return (
        <div className="space-y-3">
          <UrlField label="Banner Image" field="image_url" />
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Link URL</Label>
            <Input value={c.link_url || ""} onChange={(e) => set("link_url", e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Alt Text</Label>
            <Input value={c.alt_text || ""} onChange={(e) => set("alt_text", e.target.value)} className="text-sm" />
          </div>
          <MediaPickerDialog open={mediaPicker.open} onOpenChange={(o) => setMediaPicker({ ...mediaPicker, open: o })} onSelect={handleMediaSelect} />
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Video URL</Label>
            <Input value={c.video_url || ""} onChange={(e) => set("video_url", e.target.value)} placeholder="YouTube/Vimeo embed URL" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Caption</Label>
            <Input value={c.caption || ""} onChange={(e) => set("caption", e.target.value)} className="text-sm" />
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">No editor for this section type.</p>;
  }
};

export default SectionEditor;
