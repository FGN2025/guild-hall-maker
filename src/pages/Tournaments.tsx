import { useState, useMemo } from "react";
import { Search, Filter, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTournaments } from "@/hooks/useTournaments";
import TournamentCard from "@/components/tournaments/TournamentCard";
import CreateTournamentDialog from "@/components/tournaments/CreateTournamentDialog";
import PageHero from "@/components/PageHero";

const Tournaments = () => {
  const { tournaments, isLoading, register, unregister, createTournament, isRegistering, isCreating } = useTournaments();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.game.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tournaments, search, statusFilter]);

  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="py-8 container mx-auto px-4">
        <PageHero pageSlug="tournaments" />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">Browse & Register</p>
            <h1 className="font-display text-4xl font-bold text-foreground">Tournaments</h1>
          </div>
          <CreateTournamentDialog onCreate={createTournament} isCreating={isCreating} />
        </div>

        {/* Search / Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
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
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                onRegister={register}
                onUnregister={unregister}
                isRegistering={isRegistering}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Tournaments;
