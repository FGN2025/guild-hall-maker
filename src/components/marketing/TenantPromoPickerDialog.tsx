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
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
    event: { name: e.name, game: e.game, start_date: e.start_date, prize_pool: e.prize_pool, prize_type: (e as any).prize_type },

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
  const [selectedEvent, setSelectedEvent] = useState<TenantEvent | null>(null);
  const [linkCampaign, setLinkCampaign] = useState(true);
  const [quickCreating, setQuickCreating] = useState<string | null>(null);
  const { createCampaign } = useMarketingCampaigns();

  /** Creates (or reuses, via idempotency key) the campaign this promo belongs
   *  to so composed human promos carry the same event linkage the agent lane
   *  produces. Returns null when linking is off or creation fails. */
  const ensureCampaign = async (evt: TenantEvent): Promise<string | null> => {
    if (!linkCampaign) return null;
    try {
      return await createCampaign.mutateAsync({
        title: `${evt.name} — Promo`,
        description: `Promo campaign created from the event "${evt.name}".`,
        category: "social_media",
        tenant_id: tenantId,
        status: "pending_review",
        source_event_id: evt.id,
        idempotency_key: `promo:${tenantId}:${evt.id}`,
      });
    } catch {
      // Duplicate idempotency key or RLS block — fall back to an unlinked asset
      // rather than losing the composed promo.
      return null;
    }
  };


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
      const campaignId = await ensureCampaign(evt);
      await onSave(blob, {
        overlayConfig: sceneToOverlayConfig(scene),
        backgroundUrl: scene.backgroundUrl,
        campaignId,
      });
      toast.success(campaignId ? "Promo saved and linked to a campaign" : "Promo created and saved!");
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
        onOpenChange={(o) => { if (!o) { setSelectedScene(null); setSelectedEvent(null); onOpenChange(false); } }}
        baseImageUrl={selectedScene.backgroundUrl ?? undefined}
        onSave={async (blob, meta) => {
          const campaignId = selectedEvent ? await ensureCampaign(selectedEvent) : null;
          await onSave(blob, meta ? { ...meta, campaignId } : undefined);
        }}
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

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex items-start gap-2 mb-4 rounded-md border border-border p-3">
          <Checkbox
            id="promo-link-campaign"
            checked={linkCampaign}
            onCheckedChange={(v) => setLinkCampaign(v === true)}
          />
          <div className="grid gap-0.5">
            <Label htmlFor="promo-link-campaign" className="text-sm">Create a campaign and link this promo</Label>
            <p className="text-xs text-muted-foreground">
              Gives the promo the same event linkage the marketing agent produces, so it shows up alongside agent work.
            </p>
          </div>
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
                  onClick={() => { setSelectedEvent(evt); setSelectedScene(buildTenantEventPromo(evt, tenantPrimaryColor)); }}
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
