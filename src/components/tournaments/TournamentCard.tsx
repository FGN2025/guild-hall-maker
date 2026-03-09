import { Calendar, Users, GitBranch, Settings } from "lucide-react";
import PrizeDisplay from "@/components/tournaments/PrizeDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tournament } from "@/hooks/useTournaments";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface TournamentCardProps {
  tournament: Tournament;
  onRegister?: (id: string) => void;
  onUnregister?: (id: string) => void;
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
  onRegister,
  onUnregister,
  isRegistering,
}: TournamentCardProps) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const isFull = t.registrations_count >= t.max_participants;
  const showRegCount = isAdmin;
  const canRegister = (t.status === "open" || t.status === "upcoming") && !isFull && !t.is_registered;
  const dateStr = format(new Date(t.start_date), "MMM d, yyyy");
  const showBracket = t.status === "in_progress" || t.status === "completed";
  const isCreator = user?.id === t.created_by;

  return (
    <div
      className="rounded-xl border border-border bg-card/70 backdrop-blur-sm glow-card flex flex-col overflow-hidden cursor-pointer transition-transform hover:scale-[1.01]"
      onClick={() => navigate(`/tournaments/${t.id}`)}
    >
      {/* Hero Image */}
      <div className="relative h-36 bg-muted overflow-hidden">
      {(t.image_url || t.game_cover_url) ? (
          <img src={t.image_url || t.game_cover_url!} alt={t.name} className="w-full h-full object-cover" />
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
      <div className="text-xs text-muted-foreground mb-4 h-[2.5rem] overflow-y-auto whitespace-pre-line">
        {t.description || "\u00A0"}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 sm:gap-3 text-center">
        {[
          { icon: Calendar, label: "Date", value: dateStr },
          { icon: Users, label: "Players", value: showRegCount ? `${t.registrations_count}/${t.max_participants}` : `${t.max_participants} max` },
          { icon: null, label: "Prize", value: null, isPrize: true },
        ].map((info: any) => (
          <div key={info.label} className="bg-muted rounded-lg p-3">
            {info.isPrize ? (
              <>
                <div className="font-heading text-sm font-semibold text-foreground">
                  <PrizeDisplay prizeType={(t as any).prize_type} prizePool={t.prize_pool} compact />
                </div>
                <p className="text-[10px] text-muted-foreground">{info.label}</p>
              </>
            ) : (
              <>
                <info.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mx-auto mb-1" />
                <p className="font-heading text-xs sm:text-sm font-semibold text-foreground truncate">{info.value}</p>
                <p className="text-[10px] text-muted-foreground">{info.label}</p>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
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
        {onRegister && onUnregister ? (
          t.is_registered ? (
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
          )
        ) : (
          <Button
            className="flex-1 font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate("/auth")}
          >
            Sign In to Register
          </Button>
        )}
      </div>
      </div>
    </div>
  );
};

export default TournamentCard;
