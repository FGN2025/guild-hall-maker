import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useBracket } from "@/hooks/useBracket";
import BracketMatchCard from "@/components/tournaments/BracketMatchCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Gamepad2, Swords } from "lucide-react";

const TournamentBracket = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournament, rounds, totalRounds, currentRound, matches, isLoading } = useBracket(id);

  const roundLabel = (round: number) => {
    if (totalRounds === 0) return `Round ${round}`;
    if (round === totalRounds) return "Finals";
    if (round === totalRounds - 1) return "Semifinals";
    if (round === totalRounds - 2) return "Quarterfinals";
    return `Round ${round}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-primary/15 text-primary border-primary/30";
      case "in_progress":
        return "bg-accent/15 text-accent border-accent/30";
      case "completed":
        return "bg-success/15 text-success border-success/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 container mx-auto px-4">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground font-heading"
          onClick={() => navigate("/tournaments")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tournaments
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !tournament ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-heading text-xl text-foreground mb-2">Tournament not found</h3>
            <p className="text-sm text-muted-foreground font-body">
              This tournament may have been removed.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Badge variant="outline" className={`capitalize ${statusColor(tournament.status)}`}>
                  {tournament.status.replace("_", " ")}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Gamepad2 className="h-3 w-3" /> {tournament.game}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {tournament.format.replace("_", " ")}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-1">{tournament.name}</h1>
              {currentRound > 0 && (
                <p className="text-sm text-muted-foreground font-body">
                  Currently in <span className="text-primary font-semibold">{roundLabel(currentRound)}</span>
                </p>
              )}
            </div>

            {/* Bracket */}
            {matches.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg text-foreground mb-2">No matches scheduled yet</h3>
                <p className="text-sm text-muted-foreground font-body">
                  The bracket will appear once matches are created for this tournament.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
                <div className="flex gap-8 min-w-max items-start">
                  {Object.entries(rounds)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([round, roundMatches]) => {
                      const roundNum = Number(round);
                      const isFinalRound = roundNum === totalRounds;
                      const isCurrentRound = roundNum === currentRound;

                      return (
                        <div key={round} className="flex flex-col items-center">
                          {/* Round header */}
                          <div className="mb-4 text-center">
                            <h3
                              className={`font-display text-sm font-bold uppercase tracking-wider ${
                                isCurrentRound
                                  ? "text-primary neon-text"
                                  : isFinalRound
                                  ? "gradient-text"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {roundLabel(roundNum)}
                            </h3>
                            <div className="h-0.5 w-12 mx-auto mt-1.5 rounded-full bg-border">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isCurrentRound
                                    ? "bg-primary w-full"
                                    : roundMatches.every((m) => m.status === "completed")
                                    ? "bg-success w-full"
                                    : "w-0"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Matches in this round */}
                          <div className="flex flex-col justify-around gap-6 flex-1">
                            {roundMatches.map((match) => (
                              <div
                                key={match.id}
                                className="animate-fade-in"
                              >
                                <BracketMatchCard match={match} isFinal={isFinalRound} />
                                <p className="text-[10px] text-muted-foreground text-center mt-1.5 font-body">
                                  Match {match.match_number}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-body">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" /> Winner
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-destructive" /> Eliminated
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning" /> Draw
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Pending
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TournamentBracket;
