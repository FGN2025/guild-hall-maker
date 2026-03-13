import { Award, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getAchievementIcon } from "@/lib/achievementIcons";
import type { Achievement } from "@/hooks/usePlayerAchievements";

interface Props {
  achievements: Achievement[];
}

const tierStyles = {
  bronze: {
    bg: "bg-orange-900/20",
    border: "border-orange-700/40",
    text: "text-orange-400",
    glow: "",
  },
  silver: {
    bg: "bg-slate-400/10",
    border: "border-slate-400/40",
    text: "text-slate-300",
    glow: "",
  },
  gold: {
    bg: "bg-yellow-600/15",
    border: "border-yellow-500/40",
    text: "text-yellow-400",
    glow: "shadow-[0_0_12px_-3px_hsl(45,90%,50%,0.2)]",
  },
  platinum: {
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/40",
    text: "text-cyan-300",
    glow: "shadow-[0_0_16px_-3px_hsl(180,80%,55%,0.3)]",
  },
};

const AchievementCard = ({ a }: { a: Achievement }) => {
  const Icon = getAchievementIcon(a.icon);
  const tier = tierStyles[a.tier];
  const isCustom = a.category === "custom";

  return (
    <div
      className={`rounded-lg border p-3 transition-all ${
        a.unlocked
          ? isCustom
            ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_14px_-3px_hsl(270,70%,55%,0.25)]"
            : `${tier.bg} ${tier.border} ${tier.glow}`
          : "bg-muted/30 border-border/50 opacity-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 rounded-lg p-2 ${
            a.unlocked
              ? isCustom
                ? "bg-purple-500/20 text-purple-400"
                : `${tier.bg} ${tier.text}`
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-heading text-sm font-semibold truncate ${a.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
              {a.name}
            </p>
            {isCustom ? (
              <Sparkles className="h-3 w-3 shrink-0 text-purple-400" />
            ) : (
              <span className={`text-[10px] font-display uppercase tracking-wider shrink-0 ${tier.text}`}>
                {a.tier}
              </span>
            )}
            {a.awardedBy && (
              <span className="text-[10px] font-display uppercase tracking-wider shrink-0 text-primary">★ Awarded</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-body mt-0.5">{a.description}</p>
          {isCustom && a.notes && (
            <p className="text-[11px] text-purple-400/80 font-body mt-1 italic">"{a.notes}"</p>
          )}
          {a.maxProgress != null && a.progress != null && (
            <div className="mt-2 flex items-center gap-2">
              <Progress
                value={(a.progress / a.maxProgress) * 100}
                className="h-1 flex-1 bg-muted"
              />
              <span className="text-[10px] font-display text-muted-foreground">
                {a.progress}/{a.maxProgress}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlayerAchievements = ({ achievements }: Props) => {
  const milestones = achievements.filter((a) => a.category !== "custom");
  const customs = achievements.filter((a) => a.category === "custom");
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-4">
      {/* Milestones */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> Achievements
          </h3>
          <span className="text-xs font-display text-muted-foreground">
            {unlocked}/{achievements.length} unlocked
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {milestones.map((a) => (
            <AchievementCard key={a.id} a={a} />
          ))}
        </div>
      </div>

      {/* Custom / Special Recognition */}
      {customs.length > 0 && (
        <div className="rounded-xl border border-purple-500/30 bg-card overflow-hidden">
          <div className="p-4 border-b border-purple-500/20 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h3 className="font-display text-lg font-semibold text-foreground">Special Recognition</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customs.map((a) => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerAchievements;
