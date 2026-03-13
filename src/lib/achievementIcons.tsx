import {
  Trophy, Flame, Star, Crown, Target, Shield, Swords, Zap, Medal, Award,
  Sparkles, Heart, Gem, Rocket, type LucideIcon,
} from "lucide-react";

export const ACHIEVEMENT_ICON_MAP: Record<string, LucideIcon> = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  crown: Crown,
  target: Target,
  shield: Shield,
  swords: Swords,
  zap: Zap,
  medal: Medal,
  award: Award,
  sparkles: Sparkles,
  heart: Heart,
  gem: Gem,
  rocket: Rocket,
};

export const ACHIEVEMENT_ICON_KEYS = Object.keys(ACHIEVEMENT_ICON_MAP);

export function getAchievementIcon(name: string): LucideIcon {
  return ACHIEVEMENT_ICON_MAP[name] || Trophy;
}
