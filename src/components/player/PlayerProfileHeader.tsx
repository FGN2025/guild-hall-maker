import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Swords, Target } from "lucide-react";
import type { PlayerProfile, PlayerStats } from "@/hooks/usePlayerProfile";

interface Props {
  profile: PlayerProfile;
  stats: PlayerStats | undefined;
}

const PlayerProfileHeader = ({ profile, stats }: Props) => {
  const initials = (profile.gamer_tag || profile.display_name || "??").slice(0, 2).toUpperCase();

  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center gap-6">
      <Avatar className="h-24 w-24 border-2 border-primary/30">
        <AvatarImage src={profile.avatar_url ?? undefined} />
        <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-2xl">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 text-center sm:text-left">
        <h1 className="font-display text-3xl font-bold text-foreground">
          {profile.gamer_tag || profile.display_name}
        </h1>
        {profile.gamer_tag && profile.display_name && (
          <p className="text-sm text-muted-foreground font-body mt-1">{profile.display_name}</p>
        )}
      </div>

      {stats && (
        <div className="flex gap-6 text-center">
          <div className="flex flex-col items-center">
            <Crown className="h-5 w-5 text-warning mb-1" />
            <span className="font-display text-2xl font-bold text-foreground">{stats.wins}</span>
            <span className="text-xs text-muted-foreground font-body">Wins</span>
          </div>
          <div className="flex flex-col items-center">
            <Swords className="h-5 w-5 text-primary mb-1" />
            <span className="font-display text-2xl font-bold text-foreground">{stats.total_matches}</span>
            <span className="text-xs text-muted-foreground font-body">Matches</span>
          </div>
          <div className="flex flex-col items-center">
            <Target className="h-5 w-5 text-accent mb-1" />
            <span className="font-display text-2xl font-bold text-foreground">{stats.tournaments_played}</span>
            <span className="text-xs text-muted-foreground font-body">Tournaments</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerProfileHeader;
