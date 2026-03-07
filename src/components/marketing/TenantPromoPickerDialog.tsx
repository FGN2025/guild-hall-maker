import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Megaphone } from "lucide-react";
import { format } from "date-fns";
import AssetEditorDialog from "@/components/media/AssetEditorDialog";
import type { TextOverlay } from "@/hooks/canvas/canvasTypes";
import type { TenantEvent } from "@/hooks/useTenantEvents";

type PromoData = {
  imageUrl: string;
  texts: Array<Omit<TextOverlay, "id" | "type"> & { xPct?: number; yPct?: number }>;
};

export function buildTenantEventPromo(e: TenantEvent): PromoData {
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
    texts.push({ text: `Prize: ${e.prize_pool}`, xPct: 0.05, yPct: 0.89, x: 40, y: 534, fontSize: 20, color: "#ffd700", fontFamily: "sans-serif" });
  }
  return { imageUrl, texts };
}

interface TenantPromoPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSave: (blob: Blob) => Promise<void>;
}

export function TenantPromoPickerDialog({ open, onOpenChange, tenantId, onSave }: TenantPromoPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<PromoData | null>(null);

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
            <button
              key={evt.id}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 bg-card transition-colors text-left"
              onClick={() => setSelectedPromo(buildTenantEventPromo(evt))}
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
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
