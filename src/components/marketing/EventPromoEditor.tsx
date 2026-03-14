import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Search, Megaphone } from "lucide-react";
import { format } from "date-fns";
import AssetEditorDialog from "@/components/media/AssetEditorDialog";
import type { TextOverlay } from "@/hooks/canvas/canvasTypes";

type PromoData = {
  imageUrl: string;
  texts: Array<Omit<TextOverlay, "id" | "type"> & { xPct?: number; yPct?: number }>;
};

function buildTournamentPromo(t: any, accentColor?: string | null): PromoData {
  const imageUrl = t.image_url || t.game_cover_url || "";
  const dateStr = t.start_date ? format(new Date(t.start_date), "MMMM d, yyyy") : "";
  const texts: PromoData["texts"] = [
    { text: t.name.toUpperCase(), xPct: 0.05, yPct: 0.65, x: 40, y: 390, fontSize: 42, color: "#ffffff", fontFamily: "sans-serif" },
    { text: t.game, xPct: 0.05, yPct: 0.76, x: 40, y: 456, fontSize: 22, color: "#cccccc", fontFamily: "sans-serif" },
  ];
  if (dateStr) {
    texts.push({ text: dateStr, xPct: 0.05, yPct: 0.83, x: 40, y: 498, fontSize: 20, color: "#aaaaaa", fontFamily: "sans-serif" });
  }
  if (t.prize_pool) {
    texts.push({ text: `Prize: ${t.prize_pool}`, xPct: 0.05, yPct: 0.89, x: 40, y: 534, fontSize: 20, color: accentColor || "#ffd700", fontFamily: "sans-serif" });
  }
  return { imageUrl, texts };
}

function buildChallengePromo(c: any, accentColor?: string | null): PromoData {
  const imageUrl = c.cover_image_url || c.games?.cover_image_url || "";
  const texts: PromoData["texts"] = [
    { text: c.name.toUpperCase(), xPct: 0.05, yPct: 0.65, x: 40, y: 390, fontSize: 42, color: "#ffffff", fontFamily: "sans-serif" },
    { text: c.games?.name ?? "Challenge", xPct: 0.05, yPct: 0.76, x: 40, y: 456, fontSize: 22, color: "#cccccc", fontFamily: "sans-serif" },
  ];
  if (c.start_date) {
    texts.push({ text: format(new Date(c.start_date), "MMMM d, yyyy"), xPct: 0.05, yPct: 0.83, x: 40, y: 498, fontSize: 20, color: "#aaaaaa", fontFamily: "sans-serif" });
  }
  if (c.points_first) {
    texts.push({ text: `${c.points_first} pts for 1st place`, xPct: 0.05, yPct: 0.89, x: 40, y: 534, fontSize: 20, color: accentColor || "#ffd700", fontFamily: "sans-serif" });
  }
  return { imageUrl, texts };
}

/* ═══════ Standalone editor (from tournament/challenge admin cards) ═══════ */
interface EventPromoEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialTexts: PromoData["texts"];
}

export function EventPromoEditorDialog({ open, onOpenChange, imageUrl, initialTexts }: EventPromoEditorProps) {
  const handleSave = async (blob: Blob) => {
    // Upload to media library
    const ext = "png";
    const path = `media/promo-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("app-media").upload(path, blob);
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(path);

    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("media_library").insert({
      file_name: `promo-${Date.now()}.png`,
      file_path: path,
      file_type: "image",
      mime_type: "image/png",
      url: urlData.publicUrl,
      user_id: userData.user!.id,
      category: "marketing",
    });
  };

  return (
    <AssetEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      baseImageUrl={imageUrl}
      onSave={handleSave}
      initialTexts={initialTexts}
    />
  );
}

/* ═══════ Picker dialog (from marketing library) ═══════ */
interface PromoPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (blob: Blob) => Promise<void>;
}

export function PromoPickerDialog({ open, onOpenChange, onSave }: PromoPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<PromoData | null>(null);

  const { data: tournaments = [] } = useQuery({
    queryKey: ["promo-tournaments"],
    enabled: open,
    queryFn: async () => {
      const { data: tourneys } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      const { data: games } = await supabase.from("games").select("name, cover_image_url");
      const gameCovers = new Map((games ?? []).map((g: any) => [g.name, g.cover_image_url]));
      return (tourneys ?? []).map((t: any) => ({ ...t, game_cover_url: gameCovers.get(t.game) ?? null }));
    },
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ["promo-challenges"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("challenges")
        .select("*, games(name, slug, cover_image_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const filteredTournaments = tournaments.filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.game.toLowerCase().includes(q);
  });

  const filteredChallenges = challenges.filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.games?.name ?? "").toLowerCase().includes(q);
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

        <Tabs defaultValue="tournaments">
          <TabsList className="mb-3">
            <TabsTrigger value="tournaments" className="gap-1.5"><Trophy className="h-4 w-4" /> Tournaments</TabsTrigger>
            <TabsTrigger value="challenges" className="gap-1.5"><Target className="h-4 w-4" /> Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments" className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredTournaments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tournaments found</p>
            ) : filteredTournaments.map((t: any) => (
              <button
                key={t.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 bg-card transition-colors text-left"
                onClick={() => setSelectedPromo(buildTournamentPromo(t))}
              >
                <div className="w-16 h-12 rounded bg-muted overflow-hidden shrink-0">
                  {(t.image_url || t.game_cover_url) ? (
                    <img src={t.image_url || t.game_cover_url} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Trophy className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.game} · {t.start_date ? format(new Date(t.start_date), "MMM d, yyyy") : ""}</p>
                </div>
                {t.prize_pool && <Badge variant="outline" className="shrink-0 text-xs">{t.prize_pool}</Badge>}
              </button>
            ))}
          </TabsContent>

          <TabsContent value="challenges" className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredChallenges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No challenges found</p>
            ) : filteredChallenges.map((c: any) => (
              <button
                key={c.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 bg-card transition-colors text-left"
                onClick={() => setSelectedPromo(buildChallengePromo(c))}
              >
                <div className="w-16 h-12 rounded bg-muted overflow-hidden shrink-0">
                  {(c.cover_image_url || c.games?.cover_image_url) ? (
                    <img src={c.cover_image_url || c.games?.cover_image_url} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Target className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.games?.name ?? "No game"} · {c.difficulty}</p>
                </div>
              </button>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function buildQuestPromo(q: any, accentColor?: string | null): PromoData {
  const imageUrl = q.cover_image_url || q.games?.cover_image_url || "";
  const texts: PromoData["texts"] = [
    { text: q.name.toUpperCase(), xPct: 0.05, yPct: 0.65, x: 40, y: 390, fontSize: 42, color: "#ffffff", fontFamily: "sans-serif" },
    { text: q.games?.name ?? "Quest", xPct: 0.05, yPct: 0.76, x: 40, y: 456, fontSize: 22, color: "#cccccc", fontFamily: "sans-serif" },
  ];
  if (q.start_date) {
    texts.push({ text: format(new Date(q.start_date), "MMMM d, yyyy"), xPct: 0.05, yPct: 0.83, x: 40, y: 498, fontSize: 20, color: "#aaaaaa", fontFamily: "sans-serif" });
  }
  if (q.xp_reward) {
    texts.push({ text: `${q.xp_reward} XP Reward`, xPct: 0.05, yPct: 0.89, x: 40, y: 534, fontSize: 20, color: accentColor || "#ffd700", fontFamily: "sans-serif" });
  } else if (q.points_first) {
    texts.push({ text: `${q.points_first} pts for 1st place`, xPct: 0.05, yPct: 0.89, x: 40, y: 534, fontSize: 20, color: accentColor || "#ffd700", fontFamily: "sans-serif" });
  }
  return { imageUrl, texts };
}

function buildServerPromo(s: any): PromoData {
  const imageUrl = s.image_url || s.games?.cover_image_url || "";
  const address = `${s.ip_address}${s.port ? `:${s.port}` : ""}`;
  const texts: PromoData["texts"] = [
    { text: s.name.toUpperCase(), xPct: 0.05, yPct: 0.65, x: 40, y: 390, fontSize: 42, color: "#ffffff", fontFamily: "sans-serif" },
    { text: s.games?.name ?? s.game ?? "Game Server", xPct: 0.05, yPct: 0.76, x: 40, y: 456, fontSize: 22, color: "#cccccc", fontFamily: "sans-serif" },
    { text: address, xPct: 0.05, yPct: 0.83, x: 40, y: 498, fontSize: 20, color: "#aaaaaa", fontFamily: "monospace" },
  ];
  if (s.description) {
    texts.push({ text: s.description.slice(0, 60), xPct: 0.05, yPct: 0.89, x: 40, y: 534, fontSize: 18, color: "#cccccc", fontFamily: "sans-serif" });
  }
  return { imageUrl, texts };
}

export { buildTournamentPromo, buildChallengePromo, buildQuestPromo, buildServerPromo };
export type { PromoData };
