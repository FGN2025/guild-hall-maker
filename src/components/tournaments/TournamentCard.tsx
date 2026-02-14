import { Calendar, Users, Trophy, GitBranch, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tournament } from "@/hooks/useTournaments";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface TournamentCardProps {
  tournament: Tournament;
  onViewDetails: (tournament: Tournament) => void;
  onRegister: (id: string) => void;
  onUnregister: (id: string) => void;
  isRegistering: boolean;
}

const statusColors: Record<string, string> = {
  open: "bg-primary/15 text-primary border-primary/30",
  upcoming: "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-accent/15 text-accent border-accent/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const TournamentCard = ({
  tournament: t,
  onViewDetails,
  onRegister,
  onUnregister,
  isRegistering,
}: TournamentCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFull = t.registrations_count >= t.max_participants;
  const canRegister = (t.status === "open" || t.status === "upcoming") && !isFull && !t.is_registered;
  const dateStr = format(new Date(t.start_date), "MMM d, yyyy");
  const showBracket = t.status === "in_progress" || t.status === "completed";
  const isCreator = user?.id === t.created_by;

  return (
    <div className="rounded-xl border border-border bg-card glow-card flex flex-col overflow-hidden">
      {/* Hero Image */}
      <div className="relative h-36 bg-muted overflow-hidden">
        {t.image_url ? (
          <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full gradient-primary opacity-30 flex items-center justify-center">
            <span className="font-display text-lg text-foreground/60 uppercase tracking-widest">{t.game}</span>
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline" className={statusColors[t.status] ?? ""}>
          {t.status.replace("_", " ")}
        </Badge>
        <span className="text-xs font-body text-muted-foreground capitalize">{t.format.replace("_", " ")}</span>
      </div>
      <h3 className="font-heading text-xl font-semibold text-foreground mb-1 line-clamp-1">{t.name}</h3>
      <p className="text-sm text-muted-foreground mb-2">{t.game}</p>
      {t.description && (
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{t.description}</p>
      )}
      <div className="mt-auto grid grid-cols-3 gap-3 text-center">
        {[
          { icon: Calendar, label: "Date", value: dateStr },
          { icon: Users, label: "Players", value: `${t.registrations_count}/${t.max_participants}` },
          { icon: Trophy, label: "Prize", value: t.prize_pool || "—" },
        ].map((info) => (
          <div key={info.label} className="bg-muted rounded-lg p-3">
            <info.icon className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="font-heading text-sm font-semibold text-foreground">{info.value}</p>
            <p className="text-[10px] text-muted-foreground">{info.label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          className="flex-1 font-heading tracking-wide border-border text-muted-foreground hover:text-foreground"
          onClick={() => onViewDetails(t)}
        >
          Details
        </Button>
        {isCreator && (
          <Button
            variant="outline"
            className="font-heading tracking-wide border-accent/30 text-accent hover:bg-accent/10"
            onClick={() => navigate(`/tournaments/${t.id}/manage`)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        {showBracket && (
          <Button
            variant="outline"
            className="font-heading tracking-wide border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => navigate(`/tournaments/${t.id}/bracket`)}
          >
            <GitBranch className="h-4 w-4" />
          </Button>
        )}
        {t.is_registered ? (
          <Button
            variant="secondary"
            className="flex-1 font-heading tracking-wide"
            onClick={() => onUnregister(t.id)}
            disabled={isRegistering}
          >
            Unregister
          </Button>
        ) : (
          <Button
            className="flex-1 font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onRegister(t.id)}
            disabled={!canRegister || isRegistering}
          >
            {isFull ? "Full" : "Register"}
          </Button>
        )}
      </div>
      </div>
    </div>
  );
};

export default TournamentCard;
