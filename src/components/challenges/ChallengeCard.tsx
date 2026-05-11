import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Signal, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import AchievementBadgeDisplay from "@/components/shared/AchievementBadgeDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { getSkillLabel } from "@/lib/skillTaxonomy";

interface ChallengeCardProps {
  challenge: any;
  enrollmentCount?: number;
}

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ChallengeCard = ({ challenge, enrollmentCount = 0 }: ChallengeCardProps) => {
  const c = challenge;
  const { isAdmin } = useAuth();
  const gameName = c.games?.name;
  const gameCategory = c.games?.category;
  const coverUrl = c.cover_image_url || c.games?.cover_image_url || "/placeholder.svg";

  return (
    <Link to={`/challenges/${c.id}`}>
      <Card className="overflow-hidden hover:border-primary/40 transition-all group cursor-pointer h-full glow-card">
        <div className="relative h-40 overflow-hidden">
          <img
            src={coverUrl}
            alt={c.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {gameName && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Gamepad2 className="h-3 w-3" />
                  {gameName}
                </Badge>
              )}
              {gameCategory && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/80">
                  {gameCategory}
                </Badge>
              )}
            </div>
            <Badge className={`text-xs ${difficultyColor[c.difficulty] || difficultyColor.beginner}`}>
              {c.difficulty?.charAt(0).toUpperCase() + c.difficulty?.slice(1)}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-display font-semibold text-foreground line-clamp-1">{c.name}</h3>
          {c.description && (
            <p className="text-sm text-muted-foreground font-body line-clamp-2">{c.description}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {c.estimated_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{c.estimated_minutes}m
                </span>
              )}
              {isAdmin && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {enrollmentCount} enrolled
                </span>
              )}
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              +{c.points_first} pts
            </Badge>
          </div>
          {Array.isArray(c.skill_tags) && c.skill_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {c.skill_tags.slice(0, 3).map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary/90">
                  {getSkillLabel(tag)}
                </Badge>
              ))}
              {c.skill_tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                  +{c.skill_tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          {c.achievement_id && (
            <AchievementBadgeDisplay achievementId={c.achievement_id} compact />
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default memo(ChallengeCard);
