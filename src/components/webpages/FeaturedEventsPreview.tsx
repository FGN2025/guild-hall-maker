import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Trophy, Star, Clock, Compass, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface FeaturedEvent {
  id: string;
  type: "tournament" | "challenge" | "quest";
  title: string;
  game: string;
  stat1Label: string;
  stat1Value: string;
  stat2Label: string;
  stat2Value: string;
  imageUrl?: string;
}

interface Props {
  maxItems?: number;
  types?: string[];
  showStats?: boolean;
}

const typeBadgeStyle: Record<string, string> = {
  tournament: "bg-primary/15 text-primary border-primary/30",
  challenge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  quest: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const FeaturedEventsPreview = ({ maxItems, types, showStats = true }: Props) => {
  const enabledTypes = types && types.length > 0 ? types : ["tournament", "challenge", "quest"];

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["featured-events-preview", enabledTypes.join(","), maxItems],
    queryFn: async () => {
      const results: FeaturedEvent[] = [];

      if (enabledTypes.includes("tournament")) {
        const { data: tourneys } = await (supabase
          .from("tournaments")
          .select("id, name, game, start_date, prize_pool, image_url") as any)
          .eq("is_featured", true)
          .order("start_date", { ascending: true });

        const gamesWithoutImage = (tourneys ?? []).filter((t: any) => !t.image_url).map((t: any) => t.game);
        let gameCovers: Record<string, string> = {};
        if (gamesWithoutImage.length > 0) {
          const { data: gamesData } = await supabase.from("games").select("name, cover_image_url").in("name", gamesWithoutImage);
          (gamesData ?? []).forEach((g: any) => { if (g.cover_image_url) gameCovers[g.name] = g.cover_image_url; });
        }

        (tourneys ?? []).forEach((t: any) => {
          results.push({
            id: t.id, type: "tournament", title: t.name, game: t.game,
            stat1Label: "Date", stat1Value: t.start_date ? format(new Date(t.start_date), "MMM d") : "TBD",
            stat2Label: "Prize", stat2Value: t.prize_pool || "—",
            imageUrl: t.image_url || gameCovers[t.game] || undefined,
          });
        });
      }

      if (enabledTypes.includes("challenge")) {
        const { data: challenges } = await (supabase
          .from("challenges")
          .select("id, name, points_first, estimated_minutes, cover_image_url, games(name, cover_image_url)") as any)
          .eq("is_featured", true).eq("is_active", true);

        (challenges ?? []).forEach((c: any) => {
          results.push({
            id: c.id, type: "challenge", title: c.name, game: c.games?.name ?? "",
            stat1Label: "Points", stat1Value: `${c.points_first} pts`,
            stat2Label: "Time", stat2Value: c.estimated_minutes ? `~${c.estimated_minutes}m` : "—",
            imageUrl: c.cover_image_url || c.games?.cover_image_url || undefined,
          });
        });
      }

      if (enabledTypes.includes("quest")) {
        const { data: quests } = await (supabase
          .from("quests")
          .select("id, name, points_first, xp_reward, cover_image_url, games(name, cover_image_url)") as any)
          .eq("is_featured", true).eq("is_active", true);

        (quests ?? []).forEach((q: any) => {
          results.push({
            id: q.id, type: "quest", title: q.name, game: q.games?.name ?? "",
            stat1Label: "Points", stat1Value: `${q.points_first} pts`,
            stat2Label: "XP", stat2Value: q.xp_reward ? `${q.xp_reward} XP` : "—",
            imageUrl: q.cover_image_url || q.games?.cover_image_url || undefined,
          });
        });
      }

      return maxItems ? results.slice(0, maxItems) : results;
    },
    staleTime: 60_000,
  });

  const typeIcon: Record<string, any> = { tournament: Trophy, challenge: Target, quest: Compass };
  const stat1Icons: Record<string, any> = { tournament: Calendar, challenge: Star, quest: Star };
  const stat2Icons: Record<string, any> = { tournament: Trophy, challenge: Clock, quest: Compass };

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
    </div>
  );

  if (events.length === 0) return (
    <div className="p-8 text-center text-muted-foreground text-sm">No featured events to display</div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
      {events.map((e) => {
        const TypeIcon = typeIcon[e.type];
        const Stat1Icon = stat1Icons[e.type];
        const Stat2Icon = stat2Icons[e.type];
        return (
          <div key={`${e.type}-${e.id}`} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="relative h-24 bg-muted overflow-hidden">
              {e.imageUrl ? (
                <img src={e.imageUrl} alt={e.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="font-display text-xs text-foreground/60 uppercase tracking-widest">{e.game || e.type}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-2 left-2">
                <Badge variant="outline" className={`text-[10px] ${typeBadgeStyle[e.type]}`}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {e.type.charAt(0).toUpperCase() + e.type.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="p-3 flex flex-col flex-1">
              <h4 className="font-heading text-sm font-semibold text-foreground line-clamp-1">{e.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">{e.game || "General"}</p>
              {showStats && (
                <div className="mt-auto grid grid-cols-2 gap-2 text-center">
                  <div className="bg-muted rounded-md p-2">
                    <Stat1Icon className="h-3 w-3 text-primary mx-auto mb-0.5" />
                    <p className="font-heading text-xs font-semibold text-foreground">{e.stat1Value}</p>
                    <p className="text-[9px] text-muted-foreground">{e.stat1Label}</p>
                  </div>
                  <div className="bg-muted rounded-md p-2">
                    <Stat2Icon className="h-3 w-3 text-primary mx-auto mb-0.5" />
                    <p className="font-heading text-xs font-semibold text-foreground">{e.stat2Value}</p>
                    <p className="text-[9px] text-muted-foreground">{e.stat2Label}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FeaturedEventsPreview;
