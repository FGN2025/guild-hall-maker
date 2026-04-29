import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import usePageTitle from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Star, Trophy, Target, Compass, Plus, X, Search, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type EventType = "tournament" | "challenge" | "quest";

interface FeaturedRow {
  id: string;
  type: EventType;
  title: string;
  game: string | null;
  status: string | null;
  date: string | null;
  imageUrl: string | null;
  link: string;
}

const typeMeta: Record<EventType, { label: string; icon: any; table: "tournaments" | "challenges" | "quests"; route: string; color: string }> = {
  tournament: { label: "Tournaments", icon: Trophy, table: "tournaments", route: "/tournaments", color: "text-primary" },
  challenge: { label: "Challenges", icon: Target, table: "challenges", route: "/challenges", color: "text-yellow-400" },
  quest: { label: "Quests", icon: Compass, table: "quests", route: "/quests", color: "text-emerald-400" },
};

const ModeratorFeaturedEvents = () => {
  usePageTitle("Featured Events");
  const queryClient = useQueryClient();
  const [pickerType, setPickerType] = useState<EventType | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["featured-events-admin"],
    queryFn: async () => {
      const [tRes, cRes, qRes, gRes] = await Promise.all([
        (supabase.from("tournaments") as any)
          .select("id, name, game, start_date, status, image_url, is_featured, archived_at")
          .order("start_date", { ascending: true }),
        (supabase.from("challenges") as any)
          .select("id, name, difficulty, cover_image_url, is_featured, is_active, game_id, games(name, cover_image_url)")
          .order("created_at", { ascending: false }),
        (supabase.from("quests") as any)
          .select("id, name, difficulty, cover_image_url, is_featured, is_active, game_id, games(name, cover_image_url)")
          .order("created_at", { ascending: false }),
        supabase.from("games").select("name, cover_image_url"),
      ]);

      const gameCovers = new Map((gRes.data ?? []).map((g: any) => [g.name, g.cover_image_url]));

      const tournaments: (FeaturedRow & { is_featured: boolean; archived: boolean })[] = (tRes.data ?? []).map((t: any) => ({
        id: t.id,
        type: "tournament" as const,
        title: t.name,
        game: t.game,
        status: t.status,
        date: t.start_date,
        imageUrl: t.image_url || gameCovers.get(t.game) || null,
        link: `/tournaments/${t.id}`,
        is_featured: !!t.is_featured,
        archived: !!t.archived_at,
      }));

      const challenges: (FeaturedRow & { is_featured: boolean; archived: boolean })[] = (cRes.data ?? []).map((c: any) => ({
        id: c.id,
        type: "challenge" as const,
        title: c.name,
        game: c.games?.name ?? null,
        status: c.difficulty ?? null,
        date: null,
        imageUrl: c.cover_image_url || c.games?.cover_image_url || null,
        link: `/challenges/${c.id}`,
        is_featured: !!c.is_featured,
        archived: !c.is_active,
      }));

      const quests: (FeaturedRow & { is_featured: boolean; archived: boolean })[] = (qRes.data ?? []).map((q: any) => ({
        id: q.id,
        type: "quest" as const,
        title: q.name,
        game: q.games?.name ?? null,
        status: q.difficulty ?? null,
        date: null,
        imageUrl: q.cover_image_url || q.games?.cover_image_url || null,
        link: `/quests/${q.id}`,
        is_featured: !!q.is_featured,
        archived: !q.is_active,
      }));

      return { tournaments, challenges, quests };
    },
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ type, id, featured }: { type: EventType; id: string; featured: boolean }) => {
      const table = typeMeta[type].table;
      const { error } = await (supabase.from(table) as any).update({ is_featured: featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["featured-events-admin"] });
      queryClient.invalidateQueries({ queryKey: ["featured-events"] });
      queryClient.invalidateQueries({ queryKey: ["mod-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["mod-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      toast.success(vars.featured ? "Added to Featured Events" : "Removed from Featured Events");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const featuredByType = useMemo(() => {
    if (!data) return { tournament: [], challenge: [], quest: [] } as Record<EventType, FeaturedRow[]>;
    return {
      tournament: data.tournaments.filter((t) => t.is_featured && !t.archived),
      challenge: data.challenges.filter((c) => c.is_featured && !c.archived),
      quest: data.quests.filter((q) => q.is_featured && !q.archived),
    };
  }, [data]);

  const totalFeatured = featuredByType.tournament.length + featuredByType.challenge.length + featuredByType.quest.length;

  const pickerCandidates = useMemo(() => {
    if (!data || !pickerType) return [] as FeaturedRow[];
    const source = pickerType === "tournament" ? data.tournaments : pickerType === "challenge" ? data.challenges : data.quests;
    const q = pickerSearch.trim().toLowerCase();
    return source
      .filter((r) => !r.is_featured && !r.archived)
      .filter((r) => !q || r.title.toLowerCase().includes(q) || (r.game ?? "").toLowerCase().includes(q))
      .slice(0, 50);
  }, [data, pickerType, pickerSearch]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Featured Events
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control what appears in the homepage Featured Events section.
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-sm font-heading px-3 py-1.5">
          <Star className="h-3.5 w-3.5 mr-1.5 fill-primary" />
          {totalFeatured} item{totalFeatured === 1 ? "" : "s"} featured
        </Badge>
      </div>

      {/* Sections */}
      {(["tournament", "challenge", "quest"] as EventType[]).map((type) => {
        const meta = typeMeta[type];
        const Icon = meta.icon;
        const items = featuredByType[type];
        return (
          <section key={type} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-semibold text-foreground flex items-center gap-2">
                <Icon className={`h-5 w-5 ${meta.color}`} />
                Featured {meta.label}
                <span className="text-sm text-muted-foreground font-normal">({items.length})</span>
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setPickerType(type); setPickerSearch(""); }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add to Featured
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : items.length === 0 ? (
              <Card className="bg-card/40 border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nothing featured yet — add one to surface it on the homepage.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <Card key={`${type}-${item.id}`} className="overflow-hidden bg-card/70 backdrop-blur-sm border-border">
                    <div className="flex">
                      <div className="w-24 h-24 bg-muted shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                            <Icon className={`h-6 w-6 ${meta.color}`} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 flex flex-col gap-1 min-w-0">
                        <Link to={item.link} className="font-heading text-sm font-semibold text-foreground hover:text-primary line-clamp-1">
                          {item.title}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {item.game && <span className="line-clamp-1">{item.game}</span>}
                          {item.status && <Badge variant="outline" className="capitalize text-[10px] py-0 h-4">{String(item.status).replace("_", " ")}</Badge>}
                        </div>
                        {item.date && (
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(item.date), "MMM d, yyyy")}
                          </span>
                        )}
                        <div className="mt-auto pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => toggleMutation.mutate({ type, id: item.id, featured: false })}
                            disabled={toggleMutation.isPending}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Picker dialog */}
      <Dialog open={!!pickerType} onOpenChange={(open) => !open && setPickerType(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add {pickerType ? typeMeta[pickerType].label.replace(/s$/, "") : ""} to Featured
            </DialogTitle>
            <DialogDescription>
              Pick an item to surface on the homepage Featured Events section.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or game…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto space-y-2 -mx-1 px-1">
            {pickerCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No matching items.</p>
            ) : (
              pickerCandidates.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading font-medium text-foreground line-clamp-1">{c.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.game ?? ""}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      toggleMutation.mutate({ type: c.type, id: c.id, featured: true });
                      setPickerType(null);
                    }}
                    disabled={toggleMutation.isPending}
                  >
                    <Star className="h-3.5 w-3.5 mr-1" />
                    Feature
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeratorFeaturedEvents;
