import { Trophy, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TenantPlayerAchievement } from "@/hooks/useTenantAchievements";
import { Link } from "react-router-dom";

interface Props {
  players: TenantPlayerAchievement[];
  isLoading: boolean;
}

const tierColors: Record<string, string> = {
  bronze: "bg-orange-700/20 text-orange-400 border-orange-700/30",
  silver: "bg-slate-400/20 text-slate-300 border-slate-500/30",
  gold: "bg-yellow-500/20 text-yellow-400 border-yellow-600/30",
  platinum: "bg-cyan-400/20 text-cyan-300 border-cyan-500/30",
};

const TenantAchievementsCard = ({ players, isLoading }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Player Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No players have earned achievements yet.
          </p>
        ) : (
          <div className="space-y-3">
            {players.slice(0, 10).map((player, idx) => (
              <Link
                key={player.userId}
                to={`/player/${player.userId}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                  {idx + 1}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={player.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {player.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{player.displayName}</p>
                  <div className="flex gap-1 mt-0.5">
                    {(["platinum", "gold", "silver", "bronze"] as const).map(
                      (tier) =>
                        player.tiers[tier] > 0 && (
                          <Badge
                            key={tier}
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${tierColors[tier]}`}
                          >
                            {player.tiers[tier]} {tier}
                          </Badge>
                        )
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                  <Award className="h-4 w-4 text-primary" />
                  {player.unlocked}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantAchievementsCard;
