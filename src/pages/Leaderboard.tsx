import { useMemo, useState, useEffect, CSSProperties } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Link } from "react-router-dom";
import { Trophy, Medal, Swords, Crown, Search, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Star, Shield, Award, Download, FileText, Gamepad2 } from "lucide-react";
import { exportTableCSV, exportTablePDF, type ExportColumn } from "@/lib/exportUserData";
import { useLeaderboard, type LeaderboardPlayer } from "@/hooks/useLeaderboard";
import { useSeasons, useSeasonalLeaderboard, type SeasonalPlayer } from "@/hooks/useSeasonalLeaderboard";
import { useGames } from "@/hooks/useGames";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHero from "@/components/PageHero";
import PageBackground from "@/components/PageBackground";
import TableSkeleton from "@/components/ui/table-skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import PointsWalletCard from "@/components/shared/PointsWalletCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const staggerStyle = (idx: number): CSSProperties => ({
  animationDelay: `${idx * 50}ms`,
  animationFillMode: "both",
});

type SortKey = "rank" | "total_matches" | "wins" | "points" | "challenges_completed";
type SortDir = "asc" | "desc";

const rankColor = (rank: number) => {
  if (rank === 1) return "text-warning";
  if (rank === 2) return "text-foreground/70";
  if (rank === 3) return "text-warning/60";
  return "text-muted-foreground";
};

const rankBg = (rank: number) => {
  if (rank === 1) return "bg-warning/20 ring-2 ring-warning";
  if (rank === 2) return "bg-foreground/10 ring-2 ring-foreground/30";
  if (rank === 3) return "bg-warning/10 ring-2 ring-warning/30";
  return "bg-muted";
};

const tierConfig: Record<string, { label: string; color: string; icon: typeof Star }> = {
  champion: { label: "Champion", color: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40", icon: Crown },
  epic: { label: "Epic", color: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/40", icon: Star },
  platinum: { label: "Platinum", color: "bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/40", icon: Crown },
  gold: { label: "Gold", color: "bg-[#EAB308]/20 text-[#EAB308] border-[#EAB308]/40", icon: Star },
  silver: { label: "Silver", color: "bg-[#94A3B8]/20 text-[#94A3B8] border-[#94A3B8]/40", icon: Shield },
  bronze: { label: "Bronze", color: "bg-[#D97706]/20 text-[#D97706] border-[#D97706]/40", icon: Award },
  unranked: { label: "Unranked", color: "bg-[#6B7280]/20 text-[#6B7280] border-[#6B7280]/40", icon: Shield },
};

const TierBadge = ({ tier }: { tier: string }) => {
  const config = tierConfig[tier] || tierConfig.unranked;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.color} text-[10px] gap-1 px-1.5 py-0`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
};

// Hook for game filter on seasonal tab
const useGameFilteredUserIds = (gameId: string) => {
  return useQuery({
    queryKey: ["game-filtered-user-ids", gameId],
    enabled: gameId !== "all",
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("challenge_enrollments")
        .select("user_id, challenges!inner(game_id)")
        .eq("status", "completed")
        .eq("challenges.game_id", gameId);
      if (error) throw error;
      const ids = new Set(((data ?? []) as any[]).map((d: any) => d.user_id));
      return ids;
    },
  });
};

const Leaderboard = () => {
  usePageTitle("Leaderboard");
  const { isAdmin, isModerator } = useAuth();
  const canExport = isAdmin || isModerator;
  const [tab, setTab] = useState("seasonal");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [allTimePage, setAllTimePage] = useState(1);
  const [seasonalPage, setSeasonalPage] = useState(1);
  const lbPageSize = 25;

  // Seasonal state
  const { data: seasons } = useSeasons();
  const activeSeason = seasons?.find((s) => s.status === "active");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const effectiveSeasonId = selectedSeasonId || activeSeason?.id || null;
  const { data: seasonalPlayers, isLoading: seasonalLoading } = useSeasonalLeaderboard(effectiveSeasonId);
  const selectedSeason = seasons?.find((s) => s.id === effectiveSeasonId);

  // Game filter for seasonal tab
  const { data: activeGames } = useGames();
  const [seasonalGameFilter, setSeasonalGameFilter] = useState("all");
  const { data: gameFilteredIds } = useGameFilteredUserIds(seasonalGameFilter);

  // All-Time data
  const { data: players, isLoading } = useLeaderboard();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    let list = [...players];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.display_name.toLowerCase().includes(q) ||
        (p.gamer_tag && p.gamer_tag.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [players, search, sortKey, sortDir]);

  const filteredSeasonalPlayers = useMemo(() => {
    if (!seasonalPlayers) return [];
    let list = [...seasonalPlayers];
    // Game filter
    if (seasonalGameFilter !== "all" && gameFilteredIds) {
      list = list.filter((p) => gameFilteredIds.has(p.user_id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.display_name.toLowerCase().includes(q) ||
        (p.gamer_tag && p.gamer_tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [seasonalPlayers, search, seasonalGameFilter, gameFilteredIds]);

  const seasonalTotalPages = Math.ceil(filteredSeasonalPlayers.length / lbPageSize);
  const paginatedSeasonal = filteredSeasonalPlayers.slice((seasonalPage - 1) * lbPageSize, seasonalPage * lbPageSize);

  const allTimeTotalPages = Math.ceil(sortedPlayers.length / lbPageSize);
  const paginatedAllTime = sortedPlayers.slice((allTimePage - 1) * lbPageSize, allTimePage * lbPageSize);

  useEffect(() => { setSeasonalPage(1); }, [search, effectiveSeasonId, seasonalGameFilter]);
  useEffect(() => { setAllTimePage(1); }, [search, sortKey, sortDir]);

  const renderPagination = (currentPage: number, totalPages: number, setPageFn: (p: number) => void) => {
    if (totalPages <= 1) return null;
    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPageFn(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .map((p, idx, arr) => (
              <PaginationItem key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                <PaginationLink isActive={p === currentPage} onClick={() => setPageFn(p)} className="cursor-pointer">
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPageFn(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const topThree = players?.slice(0, 3) ?? [];
  const podiumOrder = topThree.length === 3
    ? [topThree[1], topThree[0], topThree[2]]
    : topThree;

  // Export columns
  const seasonalExportCols: ExportColumn[] = [
    { key: "rank", label: "Rank" },
    { key: "display_name", label: "Player" },
    { key: "tier", label: "Tier" },
    { key: "points", label: "Points" },
    { key: "challenges_completed", label: "Challenges" },
    { key: "wins", label: "Wins" },
    { key: "matches", label: "Matches" },
  ];

  const allTimeExportCols: ExportColumn[] = [
    { key: "rank", label: "Rank" },
    { key: "display_name", label: "Player" },
    { key: "tier", label: "Tier" },
    { key: "points", label: "Points" },
    { key: "challenges_completed", label: "Challenges" },
    { key: "wins", label: "Wins" },
    { key: "total_matches", label: "Matches" },
  ];

  return (
    <>
      <PageBackground pageSlug="leaderboard" />
      <div className="space-y-6 relative z-10">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pb-4">
          <PageHero pageSlug="leaderboard" />
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2 page-heading">Global Rankings</p>
            <h1 className="font-display text-4xl font-bold text-foreground page-heading">Leaderboard</h1>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mb-6 mt-6">
            <TabsList className="bg-card/70 backdrop-blur-sm border border-border">
              <TabsTrigger value="seasonal" className="gap-2 data-[state=active]:bg-primary/20">
                <Calendar className="h-4 w-4" />
                Seasonal
              </TabsTrigger>
              <TabsTrigger value="alltime" className="gap-2 data-[state=active]:bg-primary/20">
                <Trophy className="h-4 w-4" />
                All-Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <PointsWalletCard compact />

        <Tabs value={tab} onValueChange={setTab}>

          {/* SEASONAL TAB */}
          <TabsContent value="seasonal" className="mt-6">
            {/* Season + Game selectors */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-4 p-4 rounded-xl border border-border bg-card/70 backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-heading text-muted-foreground mr-1">Season:</span>
              <Select
                value={effectiveSeasonId ?? ""}
                onValueChange={(v) => setSelectedSeasonId(v)}
              >
                <SelectTrigger className="w-full sm:w-[220px] h-9 text-sm bg-background border-border">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {(seasons ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.status === "active" && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Gamepad2 className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              <span className="text-sm font-heading text-muted-foreground mr-1">Game:</span>
              <Select value={seasonalGameFilter} onValueChange={setSeasonalGameFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm bg-background border-border">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {(activeGames ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSeason && (
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="outline" className={selectedSeason.status === "active" ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"}>
                    {selectedSeason.status === "active" ? "● Live" : "Completed"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-body">
                    {new Date(selectedSeason.start_date).toLocaleDateString()} — {new Date(selectedSeason.end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Search + Export */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-8">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-card/70 backdrop-blur-sm border-border"
                />
              </div>
              {canExport && filteredSeasonalPlayers.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    exportTableCSV(filteredSeasonalPlayers.map(p => ({ ...p, matches: p.wins + p.losses })), seasonalExportCols, `seasonal_rankings_${selectedSeason?.name || "current"}.csv`);
                  }}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    exportTablePDF(filteredSeasonalPlayers.map(p => ({ ...p, matches: p.wins + p.losses })), seasonalExportCols, `Seasonal Rankings — ${selectedSeason?.name || "Current Season"}`);
                  }}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              )}
            </div>

            {seasonalLoading ? (
              <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden">
                <div className="hidden md:grid grid-cols-14 gap-2 p-4 border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                  <span className="col-span-1">Rank</span>
                  <span className="col-span-3">Player</span>
                  <span className="col-span-2">Tier</span>
                  <span className="col-span-2 text-center">Points</span>
                  <span className="col-span-2 text-center">Challenges</span>
                  <span className="col-span-2 text-center">Wins</span>
                  <span className="col-span-2 text-center">Matches</span>
                </div>
                <TableSkeleton columns={7} rows={10} showAvatar />
              </div>
            ) : !filteredSeasonalPlayers || filteredSeasonalPlayers.length === 0 ? (
              <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg text-foreground mb-2">No seasonal rankings yet</h3>
                <p className="text-sm text-muted-foreground font-body">
                  Points are earned as match results are recorded during the season.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden">
                  <div className="hidden md:grid grid-cols-14 gap-2 p-4 border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                    <span className="col-span-1">Rank</span>
                    <span className="col-span-3">Player</span>
                    <span className="col-span-2">Tier</span>
                    <span className="col-span-2 text-center">Points</span>
                    <span className="col-span-2 text-center">Challenges</span>
                    <span className="col-span-2 text-center">Wins</span>
                    <span className="col-span-2 text-center">Matches</span>
                  </div>
                  {paginatedSeasonal.map((p, idx) => (
                    <div key={p.user_id}>
                      {/* Mobile */}
                      <div
                        className="md:hidden flex items-center gap-3 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors animate-fade-in"
                        style={staggerStyle(idx)}
                      >
                        <span className={`font-display font-bold text-lg w-8 shrink-0 ${rankColor(p.rank)}`}>
                          #{p.rank}
                        </span>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={p.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
                            {p.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link to={`/player/${p.user_id}`} className="font-heading font-semibold text-foreground text-sm truncate block hover:text-primary transition-colors">
                            {p.display_name}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <TierBadge tier={p.tier} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-sm text-primary font-bold">{p.points} pts</p>
                          <p className="text-xs text-muted-foreground">{p.challenges_completed}C / {p.wins}W / {p.wins + p.losses}M</p>
                        </div>
                      </div>
                      {/* Desktop */}
                      <div
                        className="hidden md:grid grid-cols-14 gap-2 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors items-center animate-fade-in"
                        style={staggerStyle(idx)}
                      >
                        <span className={`col-span-1 font-display font-bold text-lg ${rankColor(p.rank)}`}>
                          #{p.rank}
                        </span>
                        <div className="col-span-3 flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
                              {p.display_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <Link to={`/player/${p.user_id}`} className="font-heading font-semibold text-foreground text-sm truncate hover:text-primary transition-colors">
                            {p.display_name}
                          </Link>
                        </div>
                        <div className="col-span-2">
                          <TierBadge tier={p.tier} />
                        </div>
                        <span className="col-span-2 font-display text-sm text-primary font-bold text-center">
                          {p.points}
                        </span>
                        <span className="col-span-2 font-display text-sm text-accent-foreground font-bold text-center">
                          {p.challenges_completed}
                        </span>
                        <span className="col-span-2 font-display text-sm text-success font-bold text-center">
                          {p.wins}
                        </span>
                        <span className="col-span-2 font-body text-sm text-muted-foreground text-center">
                          {p.wins + p.losses}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {renderPagination(seasonalPage, seasonalTotalPages, setSeasonalPage)}
              </>
            )}
          </TabsContent>

          {/* ALL-TIME TAB */}
          <TabsContent value="alltime" className="mt-6">
            {/* Search + Export */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-8">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-card/70 backdrop-blur-sm border-border"
                />
              </div>
              {canExport && sortedPlayers.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    exportTableCSV(sortedPlayers, allTimeExportCols, "alltime_rankings.csv");
                  }}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    exportTablePDF(sortedPlayers, allTimeExportCols, "All-Time Rankings");
                  }}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden">
                <div className="hidden md:grid grid-cols-14 gap-2 p-4 border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                  <span className="col-span-1">Rank</span>
                  <span className="col-span-3">Player</span>
                  <span className="col-span-2">Tier</span>
                  <span className="col-span-2 text-center">Points</span>
                  <span className="col-span-2 text-center">Challenges</span>
                  <span className="col-span-2 text-center">Wins</span>
                  <span className="col-span-2 text-center">Matches</span>
                </div>
                <TableSkeleton columns={7} rows={10} showAvatar />
              </div>
            ) : !players || players.length === 0 ? (
               <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-12 text-center">
                <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg text-foreground mb-2">No rankings yet</h3>
                <p className="text-sm text-muted-foreground font-body">
                  Rankings will appear once players earn points.
                </p>
              </div>
            ) : (
              <>
                {/* Top 3 podium */}
                {topThree.length >= 3 && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10 max-w-2xl mx-auto">
                    {podiumOrder.map((p, i) => {
                      const heights = ["h-28", "h-36", "h-24"];
                      const isFirst = p.rank === 1;
                      return (
                        <div key={p.user_id} className="flex flex-col items-center animate-fade-in">
                          <Avatar className={`w-12 h-12 mb-2 ${rankBg(p.rank)}`}>
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-sm">
                              {p.display_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <Link to={`/player/${p.user_id}`} className="font-heading font-semibold text-foreground text-xs sm:text-sm text-center truncate max-w-[80px] sm:max-w-[120px] hover:text-primary transition-colors">
                            {p.display_name}
                          </Link>
                          <p className="font-display text-xs text-primary">{p.points} Points</p>
                          <p className="font-display text-xs text-success">{p.wins} Wins</p>
                          <p className="text-[10px] text-muted-foreground font-body">
                            {p.total_matches} Matches
                          </p>
                          <div
                            className={`${heights[i]} w-full mt-3 rounded-t-lg flex items-start justify-center pt-2 ${
                              isFirst ? "gradient-primary" : "bg-secondary"
                            }`}
                          >
                            {isFirst ? (
                              <Crown className="h-5 w-5 text-primary-foreground" />
                            ) : (
                              <Medal className={`h-5 w-5 ${rankColor(p.rank)}`} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full table */}
                <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden">
                  <div className="hidden md:grid grid-cols-14 gap-2 p-4 border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                    <button onClick={() => handleSort("rank")} className="col-span-1 flex items-center cursor-pointer hover:text-foreground transition-colors">
                      Rank <SortIcon col="rank" />
                    </button>
                    <span className="col-span-3">Player</span>
                    <span className="col-span-2">Tier</span>
                    <button onClick={() => handleSort("points")} className="col-span-2 flex items-center justify-center cursor-pointer hover:text-foreground transition-colors">
                      Points <SortIcon col="points" />
                    </button>
                    <button onClick={() => handleSort("challenges_completed")} className="col-span-2 flex items-center justify-center cursor-pointer hover:text-foreground transition-colors">
                      Challenges <SortIcon col="challenges_completed" />
                    </button>
                    <button onClick={() => handleSort("wins")} className="col-span-2 flex items-center justify-center cursor-pointer hover:text-foreground transition-colors">
                      Wins <SortIcon col="wins" />
                    </button>
                    <button onClick={() => handleSort("total_matches")} className="col-span-1 flex items-center justify-center cursor-pointer hover:text-foreground transition-colors">
                      Matches <SortIcon col="total_matches" />
                    </button>
                  </div>
                  {paginatedAllTime.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground font-body">
                      No players match your search.
                    </div>
                  ) : (
                    paginatedAllTime.map((p, idx) => (
                    <div key={p.user_id}>
                      {/* Mobile */}
                      <div
                        className="md:hidden flex items-center gap-3 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors animate-fade-in"
                        style={staggerStyle(idx)}
                      >
                        <span className={`font-display font-bold text-lg w-8 shrink-0 ${rankColor(p.rank)}`}>
                          #{p.rank}
                        </span>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={p.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
                            {p.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link to={`/player/${p.user_id}`} className="font-heading font-semibold text-foreground text-sm truncate block hover:text-primary transition-colors">
                            {p.display_name}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <TierBadge tier={p.tier} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-sm text-primary font-bold">{p.points} pts</p>
                          <p className="text-xs text-muted-foreground">{p.challenges_completed}C / {p.wins}W / {p.total_matches}M</p>
                        </div>
                        {p.rank <= 3 && (
                          <Trophy className={`h-4 w-4 shrink-0 ${rankColor(p.rank)}`} />
                        )}
                      </div>
                      {/* Desktop */}
                      <div
                        className="hidden md:grid grid-cols-14 gap-2 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors items-center animate-fade-in"
                        style={staggerStyle(idx)}
                      >
                        <span className={`col-span-1 font-display font-bold text-lg ${rankColor(p.rank)}`}>
                          #{p.rank}
                        </span>
                        <div className="col-span-3 flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
                              {p.display_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <Link to={`/player/${p.user_id}`} className="font-heading font-semibold text-foreground text-sm truncate hover:text-primary transition-colors">
                            {p.display_name}
                          </Link>
                        </div>
                        <div className="col-span-2">
                          <TierBadge tier={p.tier} />
                        </div>
                        <span className="col-span-2 font-display text-sm text-primary font-bold text-center">
                          {p.points}
                        </span>
                        <span className="col-span-2 font-display text-sm text-accent-foreground font-bold text-center">
                          {p.challenges_completed}
                        </span>
                        <span className="col-span-2 font-display text-sm text-success font-bold text-center">
                          {p.wins}
                        </span>
                        <span className="col-span-1 font-body text-sm text-muted-foreground text-center">
                          {p.total_matches}
                        </span>
                      </div>
                    </div>
                  ))
                  )}
                </div>
                {renderPagination(allTimePage, allTimeTotalPages, setAllTimePage)}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Leaderboard;
