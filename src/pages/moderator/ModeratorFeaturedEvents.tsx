import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import usePageTitle from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Star, Trophy, Target, Compass, Plus, X, Search, Sparkles, CalendarClock, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { featuredWindowStatus, toLocalInputValue, type FeaturedWindowStatus } from "@/lib/featuredWindow";

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
  featuredStart: string | null;
  featuredEnd: string | null;
}

const typeMeta: Record<EventType, { label: string; icon: any; table: "tournaments" | "challenges" | "quests"; route: string; color: string }> = {
  tournament: { label: "Tournaments", icon: Trophy, table: "tournaments", route: "/tournaments", color: "text-primary" },
  challenge: { label: "Challenges", icon: Target, table: "challenges", route: "/challenges", color: "text-yellow-400" },
  quest: { label: "Quests", icon: Compass, table: "quests", route: "/quests", color: "text-emerald-400" },
};

const windowStatusStyle: Record<FeaturedWindowStatus, string> = {
  live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  scheduled: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  expired: "bg-muted text-muted-foreground border-border",
};

const ModeratorFeaturedEvents = () => {
  usePageTitle("Featured Events");
  const queryClient = useQueryClient();
  const [pickerType, setPickerType] = useState<EventType | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [scheduleTarget, setScheduleTarget] = useState<FeaturedRow | null>(null);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["featured-events-admin"],
    queryFn: async () => {
      const [tRes, cRes, qRes, gRes] = await Promise.all([
        (supabase.from("tournaments") as any)
          .select("id, name, game, start_date, status, image_url, is_featured, archived_at, featured_start_at, featured_end_at")
          .order("start_date", { ascending: true }),
        (supabase.from("challenges") as any)
          .select("id, name, difficulty, cover_image_url, is_featured, is_active, game_id, featured_start_at, featured_end_at, games(name, cover_image_url)")
          .order("created_at", { ascending: false }),
        (supabase.from("quests") as any)
          .select("id, name, difficulty, cover_image_url, is_featured, is_active, game_id, featured_start_at, featured_end_at, games(name, cover_image_url)")
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
        featuredStart: t.featured_start_at ?? null,
        featuredEnd: t.featured_end_at ?? null,
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
        featuredStart: c.featured_start_at ?? null,
        featuredEnd: c.featured_end_at ?? null,
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
        featuredStart: q.featured_start_at ?? null,
        featuredEnd: q.featured_end_at ?? null,
      }));

      return { tournaments, challenges, quests };
    },
    staleTime: 30_000,
  });

  const invalidateFeatured = () => {
    queryClient.invalidateQueries({ queryKey: ["featured-events-admin"] });
    queryClient.invalidateQueries({ queryKey: ["featured-events"] });
    queryClient.invalidateQueries({ queryKey: ["featured-events-preview"] });
    queryClient.invalidateQueries({ queryKey: ["mod-tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["mod-challenges"] });
    queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
  };

  const removeMutation = useMutation({
    mutationFn: async ({ type, id }: { type: EventType; id: string }) => {
      const table = typeMeta[type].table;
      const { error } = await (supabase.from(table) as any)
        .update({ is_featured: false, featured_start_at: null, featured_end_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFeatured();
      toast.success("Removed from Featured Events");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ type, id, start, end }: { type: EventType; id: string; start: string; end: string | null }) => {
      const table = typeMeta[type].table;
      const { error } = await (supabase.from(table) as any)
        .update({ is_featured: true, featured_start_at: start, featured_end_at: end })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFeatured();
      setScheduleTarget(null);
      toast.success("Featured with schedule");
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

  const windowCounts = useMemo(() => {
    const all = [...featuredByType.tournament, ...featuredByType.challenge, ...featuredByType.quest];
    const now = new Date();
    const counts: Record<FeaturedWindowStatus, number> = { live: 0, scheduled: 0, expired: 0 };
    all.forEach((r) => { counts[featuredWindowStatus(r.featuredStart, r.featuredEnd, now)] += 1; });
    return counts;
  }, [featuredByType]);

  const pickerCandidates = useMemo(() => {
    if (!data || !pickerType) return [] as FeaturedRow[];
    const source = pickerType === "tournament" ? data.tournaments : pickerType === "challenge" ? data.challenges : data.quests;
    const q = pickerSearch.trim().toLowerCase();
    return source
      .filter((r) => !r.is_featured && !r.archived)
      .filter((r) => !q || r.title.toLowerCase().includes(q) || (r.game ?? "").toLowerCase().includes(q))
      .slice(0, 50);
  }, [data, pickerType, pickerSearch]);

  const openSchedule = (item: FeaturedRow) => {
    setScheduleTarget(item);
    setStartInput(item.featuredStart ? toLocalInputValue(new Date(item.featuredStart)) : toLocalInputValue(new Date()));
    setEndInput(item.featuredEnd ? toLocalInputValue(new Date(item.featuredEnd)) : "");
  };

  const saveSchedule = () => {
    if (!scheduleTarget) return;
    if (!startInput) { toast.error("Start date is required"); return; }
    const start = new Date(startInput);
    if (isNaN(start.getTime())) { toast.error("Invalid start date"); return; }
    let endIso: string | null = null;
    if (endInput) {
      const end = new Date(endInput);
      if (isNaN(end.getTime())) { toast.error("Invalid end date"); return; }
      if (end <= start) { toast.error("End must be after start"); return; }
      endIso = end.toISOString();
    }
    scheduleMutation.mutate({ type: scheduleTarget.type, id: scheduleTarget.id, start: start.toISOString(), end: endIso });
  };

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
            Control what appears in the homepage Featured Events section. Items show only inside their scheduled window.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-sm font-heading px-3 py-1.5">
            <Star className="h-3.5 w-3.5 mr-1.5 fill-primary" />
            {windowCounts.live} live
          </Badge>
          {windowCounts.scheduled > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-heading px-2.5 py-1">
              {windowCounts.scheduled} scheduled
            </Badge>
          )}
          {windowCounts.expired > 0 && (
            <Badge variant="outline" className="text-xs font-heading px-2.5 py-1">
              {windowCounts.expired} expired
            </Badge>
          )}
        </div>
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
                {items.map((item) => {
                  const ws = featuredWindowStatus(item.featuredStart, item.featuredEnd);
                  return (
                    <Card key={`${type}-${item.id}`} className={`overflow-hidden bg-card/70 backdrop-blur-sm border-border ${ws === "expired" ? "opacity-60" : ""}`}>
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
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                            <Badge variant="outline" className={`text-[10px] py-0 h-4 capitalize ${windowStatusStyle[ws]}`}>
                              {ws}
                            </Badge>
                            <span>
                              {item.featuredStart ? format(new Date(item.featuredStart), "MMM d, yyyy") : "—"}
                              {" → "}
                              {item.featuredEnd ? format(new Date(item.featuredEnd), "MMM d, yyyy") : "no end"}
                            </span>
                          </div>
                          <div className="mt-auto pt-1 flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => openSchedule(item)}
                              disabled={scheduleMutation.isPending}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Schedule
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => removeMutation.mutate({ type, id: item.id })}
                              disabled={removeMutation.isPending}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
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
              Pick an item to surface on the homepage Featured Events section. You'll set its schedule next.
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
                    onClick={() => { setPickerType(null); openSchedule(c); }}
                    disabled={scheduleMutation.isPending}
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

      {/* Schedule dialog */}
      <Dialog open={!!scheduleTarget} onOpenChange={(open) => !open && setScheduleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Schedule Featured Window
            </DialogTitle>
            <DialogDescription>
              {scheduleTarget?.title ? `"${scheduleTarget.title}" appears` : "This item appears"} on the homepage only between the start and end. Start is required; leave end blank to run indefinitely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="featured-start">Start (required)</Label>
              <Input
                id="featured-start"
                type="datetime-local"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="featured-end">End (optional)</Label>
              <Input
                id="featured-end"
                type="datetime-local"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScheduleTarget(null)} disabled={scheduleMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={saveSchedule} disabled={scheduleMutation.isPending}>
                <Star className="h-3.5 w-3.5 mr-1" />
                Save &amp; Feature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeratorFeaturedEvents;
