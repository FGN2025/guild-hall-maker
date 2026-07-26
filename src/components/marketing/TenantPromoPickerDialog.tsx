import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Megaphone, Zap, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import AssetEditorDialog, { type AssetSaveMeta, type SavedOverlayConfig } from "@/components/media/AssetEditorDialog";
import type { TenantEvent } from "@/hooks/useTenantEvents";
import { composePromoLayout, promoSceneToEditorTexts, type PromoScene } from "@/lib/promo/composePromoLayout";
import { renderPromoSceneToBlob } from "@/lib/promo/renderPromoBrowser";

interface TenantPromoPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSave: (blob: Blob, meta?: AssetSaveMeta) => Promise<void>;
  tenantPrimaryColor?: string | null;
}

/** Legacy helpers preserved for existing imports elsewhere in the codebase.
 *  Internally they delegate to the shared composer so human and agent output
 *  stay pixel-identical (layout parity). */
export function buildTenantEventPromo(e: TenantEvent, tenantPrimaryColor?: string | null): PromoScene {
  const scene = composePromoLayout({
    event: { name: e.name, game: e.game, start_date: e.start_date, prize_pool: e.prize_pool },
    tenantPrimaryColor,
    format: "landscape", // legacy default matched the old 1200x628 render
  });
  scene.backgroundUrl = e.image_url || null;
  return scene;
}

export async function renderPromoToBlob(scene: PromoScene): Promise<Blob> {
  return renderPromoSceneToBlob(scene);
}

export function TenantPromoPickerDialog({ open, onOpenChange, tenantId, onSave, tenantPrimaryColor }: TenantPromoPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedScene, setSelectedScene] = useState<PromoScene | null>(null);
  const [quickCreating, setQuickCreating] = useState<string | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["tenant-events-promo", tenantId],
    enabled: open && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_events" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as TenantEvent[];
    },
  });

  const filtered = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || (e.game || "").toLowerCase().includes(q);
  });

  const sceneToOverlayConfig = (scene: PromoScene): SavedOverlayConfig => ({
    canvas: { format: scene.format, width: scene.width, height: scene.height },
    overlays: promoSceneToEditorTexts(scene).map((t) => ({
      id: crypto.randomUUID(),
      type: "text",
      text: t.text,
      x: t.x,
      y: t.y,
      fontSize: t.fontSize,
      color: t.color,
      fontFamily: t.fontFamily,
      fontWeight: t.fontWeight,
    })),
  });

  const handleQuickCreate = async (evt: TenantEvent) => {
    setQuickCreating(evt.id);
    try {
      const scene = buildTenantEventPromo(evt, tenantPrimaryColor);
      const blob = await renderPromoSceneToBlob(scene);
      await onSave(blob, {
        overlayConfig: sceneToOverlayConfig(scene),
        backgroundUrl: scene.backgroundUrl,
      });
      toast.success("Promo created and saved!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate promo");
    } finally {
      setQuickCreating(null);
    }
  };

  if (selectedScene) {
    return (
      <AssetEditorDialog
        open
        onOpenChange={(o) => { if (!o) { setSelectedScene(null); onOpenChange(false); } }}
        baseImageUrl={selectedScene.backgroundUrl ?? undefined}
        onSave={onSave}
        initialOverlayConfig={sceneToOverlayConfig(selectedScene)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Create Promo from Event
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No events found</p>
          ) : filtered.map((evt) => (
            <div
              key={evt.id}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <div className="w-16 h-12 rounded bg-muted overflow-hidden shrink-0">
                {evt.image_url ? (
                  <img src={evt.image_url} alt={evt.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{evt.name}</p>
                <p className="text-xs text-muted-foreground">
                  {evt.game || "No game"} · {evt.start_date ? format(new Date(evt.start_date), "MMM d, yyyy") : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {evt.prize_pool && <Badge variant="outline" className="text-xs">{evt.prize_pool}</Badge>}
                <Badge variant="secondary" className="text-xs">{evt.status}</Badge>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  disabled={quickCreating === evt.id}
                  onClick={() => handleQuickCreate(evt)}
                  title="Quick create — auto-generate promo"
                >
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  {quickCreating === evt.id ? "Creating…" : "Quick"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedScene(buildTenantEventPromo(evt, tenantPrimaryColor))}
                  title="Open in editor"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
