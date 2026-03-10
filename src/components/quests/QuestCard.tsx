import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface QuestCardProps {
  quest: any;
  enrollmentCount?: number;
}

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

const QuestCard = ({ quest, enrollmentCount = 0 }: QuestCardProps) => {
  const q = quest;
  const { isAdmin } = useAuth();
  const gameName = q.games?.name;
  const gameCategory = q.games?.category;
  const coverUrl = q.cover_image_url || q.games?.cover_image_url || "/placeholder.svg";

  return (
    <Link to={`/quests/${q.id}`}>
      <Card className="overflow-hidden hover:border-primary/40 transition-all group cursor-pointer h-full">
        <div className="relative h-40 overflow-hidden">
          <img
            src={coverUrl}
            alt={q.name}
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
            <Badge className={`text-xs ${difficultyColor[q.difficulty] || difficultyColor.beginner}`}>
              {q.difficulty?.charAt(0).toUpperCase() + q.difficulty?.slice(1)}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-display font-semibold text-foreground line-clamp-1">{q.name}</h3>
          {q.description && (
            <p className="text-sm text-muted-foreground font-body line-clamp-2">{q.description}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {q.estimated_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{q.estimated_minutes}m
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
              +{q.points_first} pts
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default QuestCard;
