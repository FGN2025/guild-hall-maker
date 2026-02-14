import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Trophy, Gamepad2, FileText, GitBranch, Settings } from "lucide-react";
import { Tournament } from "@/hooks/useTournaments";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  tournament: Tournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (id: string) => void;
  onUnregister: (id: string) => void;
  isRegistering: boolean;
}

const TournamentDetailsDialog = ({ tournament: t, open, onOpenChange, onRegister, onUnregister, isRegistering }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!t) return null;

  const isFull = t.registrations_count >= t.max_participants;
  const canRegister = (t.status === "open" || t.status === "upcoming") && !isFull && !t.is_registered;
  const isCreator = user?.id === t.created_by;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border/50 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 capitalize">
              {t.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground capitalize">{t.format.replace("_", " ")}</span>
          </div>
          <DialogTitle className="font-display text-2xl">{t.name}</DialogTitle>
          <DialogDescription className="font-body">{t.game}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {t.description && (
            <p className="text-sm text-muted-foreground font-body">{t.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Calendar, label: "Start Date", value: format(new Date(t.start_date), "MMM d, yyyy · h:mm a") },
              { icon: Users, label: "Players", value: `${t.registrations_count} / ${t.max_participants}` },
              { icon: Trophy, label: "Prize Pool", value: t.prize_pool || "None" },
              { icon: Gamepad2, label: "Entry Fee", value: t.entry_fee ? `$${t.entry_fee}` : "Free" },
            ].map((info) => (
              <div key={info.label} className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <info.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{info.label}</span>
                </div>
                <p className="font-heading text-sm font-semibold text-foreground">{info.value}</p>
              </div>
            ))}
          </div>

          {t.rules && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-heading text-sm text-foreground">Rules</span>
              </div>
              <p className="text-xs text-muted-foreground font-body whitespace-pre-wrap">{t.rules}</p>
            </div>
          )}

          {isCreator && (
            <Button
              variant="outline"
              className="w-full font-heading tracking-wide border-accent/30 text-accent hover:bg-accent/10 py-5"
              onClick={() => { navigate(`/tournaments/${t.id}/manage`); onOpenChange(false); }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Tournament
            </Button>
          )}

          {(t.status === "in_progress" || t.status === "completed") && (
            <Button
              variant="outline"
              className="w-full font-heading tracking-wide border-primary/30 text-primary hover:bg-primary/10 py-5"
              onClick={() => { navigate(`/tournaments/${t.id}/bracket`); onOpenChange(false); }}
            >
              <GitBranch className="h-4 w-4 mr-2" />
              View Bracket
            </Button>
          )}

          {t.is_registered ? (
            <Button
              variant="secondary"
              className="w-full font-heading tracking-wide py-5"
              onClick={() => { onUnregister(t.id); onOpenChange(false); }}
              disabled={isRegistering}
            >
              Cancel Registration
            </Button>
          ) : (
            <Button
              className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5"
              onClick={() => { onRegister(t.id); onOpenChange(false); }}
              disabled={!canRegister || isRegistering}
            >
              {isFull ? "Tournament Full" : "Register Now"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentDetailsDialog;
