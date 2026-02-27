import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useTournamentManagement, ManageMatch } from "@/hooks/useTournamentManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Trophy,
  Users,
  Swords,
  GitBranch,
  Play,
  CheckCircle,
  Settings,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import EditTournamentDialog from "@/components/tournaments/EditTournamentDialog";

const statusColors: Record<string, string> = {
  open: "bg-primary/15 text-primary border-primary/30",
  upcoming: "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-accent/15 text-accent border-accent/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const TournamentManage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    tournament,
    players,
    matches,
    isLoading,
    isOwner,
    generateBracket,
    isGenerating,
    updateScore,
    isUpdatingScore,
    updateStatus,
    isUpdatingStatus,
    updateDetails,
    isUpdatingDetails,
    resetBracket,
    isResettingBracket,
  } = useTournamentManagement(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background grid-bg">
        <div className="py-8 container mx-auto px-4 flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!tournament || !isOwner) {
    return (
      <div className="min-h-screen bg-background grid-bg">
        <div className="py-8 container mx-auto px-4">
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-heading text-lg text-foreground mb-2">Access Denied</h3>
            <p className="text-sm text-muted-foreground font-body">
              You can only manage tournaments you created.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/tournaments")}>
              Back to Tournaments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasMatches = matches.length > 0;
  const hasCompletedMatches = matches.some((m) => m.status === "completed");
  const rounds = matches.reduce<Record<number, ManageMatch[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="py-8 container mx-auto px-4 max-w-5xl">
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground font-heading"
          onClick={() => navigate("/tournaments")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tournaments
        </Button>

        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-5 w-5 text-primary" />
                <Badge variant="outline" className={cn("capitalize", statusColors[tournament.status])}>
                  {tournament.status.replace("_", " ")}
                </Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">{tournament.name}</h1>
              <p className="text-sm text-muted-foreground font-body mt-1">{tournament.game} · {tournament.format.replace("_", " ")}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <EditTournamentDialog
                tournament={tournament}
                onUpdate={updateDetails}
                isUpdating={isUpdatingDetails}
              />
              <Button
                variant="outline"
                className="font-heading border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => navigate(`/tournaments/${id}/bracket`)}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                View Bracket
              </Button>
              <Select
                value={tournament.status}
                onValueChange={(val) => updateStatus(val)}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-[160px] bg-card border-border font-heading text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Players */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Registered Players
                </h3>
                <span className="text-xs text-muted-foreground font-display">
                  {players.length}/{tournament.max_participants}
                </span>
              </div>
              {players.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground font-body">No players registered yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {players.map((p, idx) => (
                    <div key={p.user_id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs text-muted-foreground font-display w-6">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm text-foreground truncate">
                          {p.gamer_tag || p.display_name}
                        </p>
                        {p.gamer_tag && (
                          <p className="text-xs text-muted-foreground truncate">{p.display_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!hasMatches && players.length >= 2 && (
                <div className="p-4 border-t border-border">
                  <Button
                    className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => generateBracket()}
                    disabled={isGenerating}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate Bracket"}
                  </Button>
                </div>
              )}

              {hasMatches && !hasCompletedMatches && (
                <div className="p-4 border-t border-border">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full font-heading tracking-wide border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={isResettingBracket}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {isResettingBracket ? "Resetting..." : "Reset Bracket"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Bracket?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all match results and reset the tournament back to Open status. You can then modify registrations and regenerate the bracket.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => resetBracket()}
                        >
                          Reset Bracket
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>

          {/* Right: Matches */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  Match Management
                </h3>
              </div>

              {!hasMatches ? (
                <div className="p-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-heading text-lg text-foreground mb-2">No matches yet</h3>
                  <p className="text-sm text-muted-foreground font-body">
                    Generate a bracket from the registered players to create matches.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {Object.entries(rounds)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([round, roundMatches]) => (
                      <div key={round}>
                        <div className="px-4 py-2 bg-muted/50">
                          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Round {round}
                          </h4>
                        </div>
                        <div className="divide-y divide-border/50">
                          {roundMatches.map((match) => (
                            <MatchRow
                              key={match.id}
                              match={match}
                              onUpdateScore={updateScore}
                              isUpdating={isUpdatingScore}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MatchRowProps {
  match: ManageMatch;
  onUpdateScore: (data: { matchId: string; player1Score: number; player2Score: number }) => void;
  isUpdating: boolean;
}

const MatchRow = ({ match, onUpdateScore, isUpdating }: MatchRowProps) => {
  const [p1Score, setP1Score] = useState(match.player1_score?.toString() ?? "");
  const [p2Score, setP2Score] = useState(match.player2_score?.toString() ?? "");
  const [editing, setEditing] = useState(false);

  const isCompleted = match.status === "completed";
  const hasBothPlayers = !!match.player1_id && !!match.player2_id;

  const handleSave = () => {
    const s1 = parseInt(p1Score);
    const s2 = parseInt(p2Score);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return;
    onUpdateScore({ matchId: match.id, player1Score: s1, player2Score: s2 });
    setEditing(false);
  };

  return (
    <div className="px-4 py-3 flex items-center gap-4">
      <span className="text-xs text-muted-foreground font-display w-8 shrink-0">
        M{match.match_number}
      </span>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        {/* Player 1 */}
        <span
          className={cn(
            "font-heading text-sm truncate flex-1 text-right",
            match.winner_id === match.player1_id ? "text-success font-semibold" : "text-foreground",
            !match.player1_name && "text-muted-foreground italic"
          )}
        >
          {match.player1_name ?? "TBD"}
        </span>

        {/* Scores */}
        {editing && hasBothPlayers ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={999}
              value={p1Score}
              onChange={(e) => setP1Score(e.target.value)}
              className="w-14 h-8 text-center bg-card border-border font-display text-sm"
            />
            <span className="text-muted-foreground text-xs">vs</span>
            <Input
              type="number"
              min={0}
              max={999}
              value={p2Score}
              onChange={(e) => setP2Score(e.target.value)}
              className="w-14 h-8 text-center bg-card border-border font-display text-sm"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("font-display text-sm w-6 text-center", isCompleted ? "text-foreground" : "text-muted-foreground")}>
              {match.player1_score ?? "—"}
            </span>
            <span className="text-muted-foreground text-xs">vs</span>
            <span className={cn("font-display text-sm w-6 text-center", isCompleted ? "text-foreground" : "text-muted-foreground")}>
              {match.player2_score ?? "—"}
            </span>
          </div>
        )}

        {/* Player 2 */}
        <span
          className={cn(
            "font-heading text-sm truncate flex-1",
            match.winner_id === match.player2_id ? "text-success font-semibold" : "text-foreground",
            !match.player2_name && "text-muted-foreground italic"
          )}
        >
          {match.player2_name ?? "TBD"}
        </span>
      </div>

      {/* Actions */}
      <div className="shrink-0">
        {isCompleted ? (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] font-display">
            <CheckCircle className="h-3 w-3 mr-1" /> Done
          </Badge>
        ) : hasBothPlayers ? (
          editing ? (
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs font-heading bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={isUpdating}>
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs font-heading" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-heading border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setEditing(true)}
            >
              Set Score
            </Button>
          )
        ) : (
          <Badge variant="outline" className="text-[10px] font-display text-muted-foreground border-border">
            Waiting
          </Badge>
        )}
      </div>
    </div>
  );
};

export default TournamentManage;
