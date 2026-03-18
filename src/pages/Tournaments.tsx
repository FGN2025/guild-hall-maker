import { useState, useMemo, CSSProperties } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Filter, Trophy, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useTournaments } from "@/hooks/useTournaments";
import TournamentCard from "@/components/tournaments/TournamentCard";
import PageHero from "@/components/PageHero";
import PageBackground from "@/components/PageBackground";

const Tournaments = () => {
  usePageTitle("Tournaments");
  const { user } = useAuth();
  const { tournaments, isLoading, register, unregister, isRegistering } = useTournaments();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [sortBy, setSortBy] = useState("date_asc");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filtered = useMemo(() => {
    const result = tournaments.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.game.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ? true
        : statusFilter === "open" ? ((t.effective_status === "open" || t.effective_status === "upcoming") || t.is_registered)
        : statusFilter === "past" ? (t.effective_status === "closed" || t.effective_status === "completed")
        : statusFilter === "registered" ? t.is_registered
        : t.effective_status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case "date_desc":
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "prize_desc": {
          const prizeA = parseFloat(a.prize_pool?.replace(/[^0-9.]/g, "") || "0");
          const prizeB = parseFloat(b.prize_pool?.replace(/[^0-9.]/g, "") || "0");
          return prizeB - prizeA;
        }
        case "prize_asc": {
          const prizeA = parseFloat(a.prize_pool?.replace(/[^0-9.]/g, "") || "0");
          const prizeB = parseFloat(b.prize_pool?.replace(/[^0-9.]/g, "") || "0");
          return prizeA - prizeB;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [tournaments, search, statusFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedTournaments = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useMemo(() => { setPage(1); }, [search, statusFilter, sortBy]);

  return (
    <>
      <PageBackground pageSlug="tournaments" />
      <div className="space-y-6 relative z-10">
        <div className="sticky top-0 z-20 bg-background -mx-4 px-4 md:-mx-6 md:px-6 -mt-4 pt-4 md:-mt-6 md:pt-6 pb-4">
          <div className="mb-3 flex items-center md:hidden">
            <SidebarTrigger className="border border-border bg-card/90 backdrop-blur-sm" />
          </div>
          <PageHero pageSlug="tournaments" />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2 page-heading">Browse & Register</p>
              <h1 className="font-display text-4xl font-bold text-foreground page-heading">Tournaments</h1>
            </div>
            {!user && (
              <Link to="/auth">
                <Button className="font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90">
                  Sign In to Register
                </Button>
              </Link>
            )}
          </div>

          {/* Search / Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or game..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card border-border font-body"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-card border-border font-body">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="past">Past / Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px] bg-card border-border font-body">
                <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_asc">Date (Earliest)</SelectItem>
                <SelectItem value="date_desc">Date (Latest)</SelectItem>
                <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z–A)</SelectItem>
                <SelectItem value="prize_desc">Prize (Highest)</SelectItem>
                <SelectItem value="prize_asc">Prize (Lowest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(() => {
          const filtersActive = search || statusFilter !== "open" || sortBy !== "date_asc";
          return (
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1.5 text-sm font-body px-3 py-1 rounded-full transition-colors ${
                filtersActive
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground"
              }`}>
                <span className="font-semibold">{filtered.length}</span>
                {filtered.length === 1 ? "tournament" : "tournaments"} found
              </span>
            </div>
          );
        })()}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/70 overflow-hidden animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                <Skeleton className="h-36 w-full rounded-none" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="grid grid-cols-3 gap-3 pt-4">
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                  </div>
                  <Skeleton className="h-10 w-full mt-4 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-heading text-xl text-foreground mb-2">No tournaments found</h3>
            <p className="text-sm text-muted-foreground font-body">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Be the first to create a tournament!"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTournaments.map((t, idx) => (
                <div key={t.id} className="animate-fade-in" style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" } as CSSProperties}>
                <TournamentCard
                    key={t.id}
                    tournament={t}
                    onRegister={user ? register : undefined}
                    onUnregister={user ? unregister : undefined}
                    isRegistering={isRegistering}
                  />
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p)}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Tournaments;
