import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useBracket } from "@/hooks/useBracket";
import BracketMatchCard from "@/components/tournaments/BracketMatchCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Gamepad2, Swords } from "lucide-react";
import { useRef, useEffect } from "react";

const TournamentBracket = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournament, rounds, totalRounds, currentRound, matches, isLoading } = useBracket(id);
  const bracketRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Draw connecting lines between bracket rounds
  useEffect(() => {
    if (!bracketRef.current || !svgRef.current || matches.length === 0) return;

    const timer = setTimeout(() => {
      const container = bracketRef.current!;
      const svg = svgRef.current!;

      // Clear all lines (keep defs)
      const children = Array.from(svg.children);
      children.forEach((child) => {
        if (child.tagName !== 'defs') {
          svg.removeChild(child);
        }
      });

      // Get all round containers
      const roundDivs = Array.from(container.querySelectorAll('[data-round]')) as HTMLElement[];
      if (roundDivs.length < 2) return;

      // For each pair of consecutive rounds, draw lines
      for (let i = 0; i < roundDivs.length - 1; i++) {
        const currentRound = roundDivs[i];
        const nextRound = roundDivs[i + 1];

        const currentMatches = Array.from(currentRound.querySelectorAll('[data-match-id]')) as HTMLElement[];
        const nextMatches = Array.from(nextRound.querySelectorAll('[data-match-id]')) as HTMLElement[];

        if (currentMatches.length === 0 || nextMatches.length === 0) continue;

        // Draw lines from current round matches to next round
        currentMatches.forEach((match, idx) => {
          const r1 = match.getBoundingClientRect();
          const cr = container.getBoundingClientRect();

          const x1 = r1.right - cr.left;
          const y1 = r1.top - cr.top + r1.height / 2;

          // Each pair of current matches feeds into next match
          const nextIdx = Math.floor(idx / 2);
          const nextMatch = nextMatches[Math.min(nextIdx, nextMatches.length - 1)];

          if (nextMatch) {
            const r2 = nextMatch.getBoundingClientRect();
            const x2 = r2.left - cr.left;
            const y2 = r2.top - cr.top + r2.height / 2;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
            line.setAttribute('stroke', 'hsl(var(--primary))');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-linecap', 'round');
            line.setAttribute('opacity', '0.5');
            svg.appendChild(line);
          }
        });
      }

      // Update SVG size
      svg.setAttribute('width', String(container.scrollWidth));
      svg.setAttribute('height', String(container.scrollHeight));
    }, 50);

    return () => clearTimeout(timer);
  }, [matches.length]);

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
              <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto relative" ref={bracketRef}>
                <svg
                  ref={svgRef}
                  className="absolute top-0 left-0 pointer-events-none z-0"
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: "600px",
                  }}
                >
                  <defs>
                    <linearGradient id="bracket-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="relative flex gap-8 min-w-max items-start z-10">
                  {Object.entries(rounds)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([round, roundMatches]) => {
                      const roundNum = Number(round);
                      const isFinalRound = roundNum === totalRounds;
                      const isCurrentRound = roundNum === currentRound;

                      return (
                        <div
                          key={round}
                          className="flex flex-col items-center"
                          data-round={roundNum}
                        >
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
                              <div key={match.id} className="animate-fade-in" data-match-id={match.id}>
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
