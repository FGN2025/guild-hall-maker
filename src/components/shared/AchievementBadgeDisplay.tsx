import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import { getAchievementIcon } from "@/lib/achievementIcons";

interface AchievementBadgeDisplayProps {
  achievementId: string | null | undefined;
  compact?: boolean;
}

const tierColors: Record<string, string> = {
  bronze: "text-amber-600",
  silver: "text-muted-foreground",
  gold: "text-yellow-500",
  platinum: "text-cyan-400",
  special: "text-purple-400",
};

const tierBgColors: Record<string, string> = {
  bronze: "bg-amber-600/10 border-amber-600/20",
  silver: "bg-muted border-border",
  gold: "bg-yellow-500/10 border-yellow-500/20",
  platinum: "bg-cyan-400/10 border-cyan-400/20",
  special: "bg-purple-400/10 border-purple-400/20",
};

const AchievementBadgeDisplay = ({ achievementId, compact = false }: AchievementBadgeDisplayProps) => {
  const { data: achievement } = useQuery({
    queryKey: ["achievement-definition", achievementId],
    enabled: !!achievementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievement_definitions")
        .select("id, name, tier, icon, description")
        .eq("id", achievementId!)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!achievementId || !achievement) return null;

  const Icon = getAchievementIcon(achievement.icon);
  const tierColor = tierColors[achievement.tier] || "text-foreground";
  const bgColor = tierBgColors[achievement.tier] || "bg-muted border-border";

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${bgColor}`}>
        <Icon className={`h-3 w-3 ${tierColor}`} />
        <span className="font-heading font-medium text-foreground">{achievement.name}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${bgColor}`}>
      <Icon className={`h-6 w-6 ${tierColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Trophy className={`h-3.5 w-3.5 ${tierColor}`} />
          <span className="font-heading text-sm font-semibold text-foreground">{achievement.name}</span>
          <span className="text-[10px] text-muted-foreground capitalize">({achievement.tier})</span>
        </div>
        {achievement.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{achievement.description}</p>
        )}
      </div>
    </div>
  );
};

export default AchievementBadgeDisplay;
