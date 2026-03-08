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
import AssetEditorDialog from "@/components/media/AssetEditorDialog";
import type { TextOverlay } from "@/hooks/canvas/canvasTypes";
import type { TenantEvent } from "@/hooks/useTenantEvents";

type PromoData = {
  imageUrl: string;
  texts: Array<Omit<TextOverlay, "id" | "type"> & { xPct?: number; yPct?: number }>;
};

export function buildTenantEventPromo(e: TenantEvent, tenantPrimaryColor?: string | null): PromoData {
  const imageUrl = e.image_url || "";
  const dateStr = e.start_date ? format(new Date(e.start_date), "MMMM d, yyyy") : "";
  const texts: PromoData["texts"] = [
    { text: e.name.toUpperCase(), xPct: 0.05, yPct: 0.65, x: 40, y: 390, fontSize: 42, color: "#ffffff", fontFamily: "sans-serif" },
    { text: e.game || "Event", xPct: 0.05, yPct: 0.76, x: 40, y: 456, fontSize: 22, color: "#cccccc", fontFamily: "sans-serif" },
  ];
  if (dateStr) {
    texts.push({ text: dateStr, xPct: 0.05, yPct: 0.83, x: 40, y: 498, fontSize: 20, color: "#aaaaaa", fontFamily: "sans-serif" });
  }
  if (e.prize_pool) {
    texts.push({ text: `Prize: ${e.prize_pool}`, xPct: 0.05, yPct: 0.89, x: 40, y: 534, fontSize: 20, color: tenantPrimaryColor || "#ffd700", fontFamily: "sans-serif" });
  }
  return { imageUrl, texts };
}

/** Renders promo data onto an offscreen canvas and returns a PNG blob */
export async function renderPromoToBlob(promo: PromoData, width = 1200, height = 628): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Draw background image or solid dark fill
  if (promo.imageUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = promo.imageUrl;
      });
      // Cover-fit the image
      const scale = Math.max(width / img.width, height / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.drawImage(img, (width - sw) / 2, (height - sh) / 2, sw, sh);
    } catch {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);
  }

  // Dark gradient overlay for text readability
  const grad = ctx.createLinearGradient(0, height * 0.4, 0, height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Draw text overlays
  for (const t of promo.texts) {
    const x = t.xPct != null ? t.xPct * width : t.x;
    const y = t.yPct != null ? t.yPct * height : t.y;
    const fontSize = Math.round(t.fontSize * (width / 800));
    ctx.font = `bold ${fontSize}px ${t.fontFamily}`;
    ctx.fillStyle = t.color;
    ctx.textBaseline = "top";
    // Shadow for readability
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(t.text, x, y);
    ctx.shadowColor = "transparent";
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))), "image/png");
  });
}

interface TenantPromoPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSave: (blob: Blob) => Promise<void>;
  tenantPrimaryColor?: string | null;
}

export function TenantPromoPickerDialog({ open, onOpenChange, tenantId, onSave, tenantPrimaryColor }: TenantPromoPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<PromoData | null>(null);
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

  const handleQuickCreate = async (evt: TenantEvent) => {
    setQuickCreating(evt.id);
    try {
      const promo = buildTenantEventPromo(evt);
      const blob = await renderPromoToBlob(promo);
      await onSave(blob);
      toast.success("Promo created and saved!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate promo");
    } finally {
      setQuickCreating(null);
    }
  };

  if (selectedPromo) {
    return (
      <AssetEditorDialog
        open
        onOpenChange={(o) => { if (!o) { setSelectedPromo(null); onOpenChange(false); } }}
        baseImageUrl={selectedPromo.imageUrl}
        onSave={onSave}
        initialTexts={selectedPromo.texts}
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
                  onClick={() => setSelectedPromo(buildTenantEventPromo(evt))}
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
