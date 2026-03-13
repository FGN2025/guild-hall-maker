import { useState, useMemo } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useGames } from "@/hooks/useGames";
import GameCard from "@/components/games/GameCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Gamepad2, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PageBackground from "@/components/PageBackground";
import PageHero from "@/components/PageHero";

const CATEGORIES = ["All", "General", "Fighting", "Shooter", "Sports", "Party", "Racing", "Simulation", "Strategy", "MOBA", "MMORPG", "RPG", "Card Game", "Puzzle", "Adventure"];

const Games = () => {
  usePageTitle("Games");
  const { data: games, isLoading } = useGames();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [hasTournaments, setHasTournaments] = useState(false);

  const { data: tournamentGameNames } = useQuery({
    queryKey: ["tournament-game-names"],
    queryFn: async () => {
      const { data } = await supabase.from("tournaments").select("game");
      return [...new Set((data ?? []).map(t => t.game))];
    },
  });

  const filtered = useMemo(() => {
    if (!games) return [];
    return games.filter(g => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "All" && g.category !== category) return false;
      if (hasTournaments && !(tournamentGameNames ?? []).includes(g.name)) return false;
      return true;
    });
  }, [games, search, category, hasTournaments, tournamentGameNames]);

  return (
    <>
      <PageBackground pageSlug="games" />
      <div className="space-y-6 relative z-10">
        <PageHero pageSlug="games" />

        {/* Page heading */}
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2 page-heading">Browse Library</p>
          <h1 className="font-display text-4xl font-bold text-foreground page-heading flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-primary" /> Games
          </h1>
        </div>

        {/* Search / Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-card border-border font-body"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border font-body">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border">
            <Checkbox
              id="has-tournaments"
              checked={hasTournaments}
              onCheckedChange={(v) => setHasTournaments(!!v)}
            />
            <Label htmlFor="has-tournaments" className="text-sm font-heading cursor-pointer whitespace-nowrap">
              Has Tournaments
            </Label>
          </div>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground font-heading">
            {filtered.length} game{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Game grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                <Skeleton className="aspect-[3/4] w-full rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground font-heading">
            No games found.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Games;
