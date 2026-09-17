import { Award, Lock, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface GameBadgePanelProps {
  gameName: string;
  completed: number;
  total: number;
}

const TIERS = [1, 3, 5, 10];

const GameBadgePanel = ({ gameName, completed, total }: GameBadgePanelProps) => {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const nextTier = TIERS.find((t) => completed < t && t <= total) ?? null;

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-black/50"
          style={{ boxShadow: "0 0 26px -6px hsl(var(--game-accent))" }}
        >
          <Trophy className="h-8 w-8" style={{ color: "hsl(var(--game-accent))" }} />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-white">
            {pathway ? pathway.name : `${gameName} Progress`}
          </h2>
          <p className="font-body text-sm text-white/70">
            {pathway
              ? "Complete these challenges to work toward your merit badge."
              : "Complete challenges to climb this game's tiers."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-sm text-white">
          {completed} / {total} challenges completed
        </p>
        <Progress value={pct} className="h-2.5" />
      </div>

      <div className="flex items-center gap-3">
        {TIERS.map((t) => {
          const unlocked = completed >= t;
          const reachable = t <= total;
          return (
            <div
              key={t}
              title={`${t} challenge${t === 1 ? "" : "s"}`}
              className="flex h-11 w-11 items-center justify-center rounded-lg border"
              style={{
                borderColor: unlocked ? "hsl(var(--game-accent))" : "hsl(0 0% 100% / 0.15)",
                backgroundColor: unlocked ? "hsl(var(--game-accent) / 0.15)" : "hsl(0 0% 0% / 0.4)",
              }}
            >
              {reachable ? (
                <Award
                  className="h-5 w-5"
                  style={{ color: unlocked ? "hsl(var(--game-accent))" : "hsl(0 0% 100% / 0.35)" }}
                />
              ) : (
                <Lock className="h-4 w-4 text-white/30" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto rounded-xl border border-white/10 bg-black/40 p-4">
        {nextTier ? (
          <>
            <p className="font-display text-sm font-semibold text-white">Next Badge Reward</p>
            <p className="font-body text-xs text-white/70">
              Complete {nextTier - completed} more challenge{nextTier - completed === 1 ? "" : "s"} to unlock the next tier.
            </p>
          </>
        ) : (
          <p className="font-body text-xs text-white/70">
            Every tier unlocked for {gameName}. Nice work.
          </p>
        )}
        {pathway && (
          <Link
            to={`/pathways`}
            className="mt-2 inline-block font-body text-xs underline"
            style={{ color: "hsl(var(--game-accent))" }}
          >
            View the {pathway.name} pathway
          </Link>
        )}
      </div>
    </div>
  );
};

export default GameBadgePanel;
