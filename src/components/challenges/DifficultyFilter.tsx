import { Badge } from "@/components/ui/badge";

export const DIFFICULTIES = ["all", "beginner", "intermediate", "advanced"] as const;
export type DifficultyValue = (typeof DIFFICULTIES)[number];

interface DifficultyFilterProps {
  value: DifficultyValue;
  onChange: (value: DifficultyValue) => void;
  counts?: Record<string, number>;
}

const label: Record<DifficultyValue, string> = {
  all: "All Challenges",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const DifficultyFilter = ({ value, onChange, counts }: DifficultyFilterProps) => (
  <div className="flex flex-wrap gap-2">
    {DIFFICULTIES.map((d) => {
      const active = value === d;
      const count = d === "all" ? undefined : counts?.[d];
      if (d !== "all" && count === 0) return null;
      return (
        <Badge
          key={d}
          onClick={() => onChange(d)}
          className={`cursor-pointer rounded-full px-4 py-1.5 font-semibold transition-colors ${
            active
              ? "border-0 text-background"
              : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
          }`}
          style={active ? { backgroundColor: "hsl(var(--game-accent))" } : undefined}
        >
          {label[d]}
          {count !== undefined && <span className="ml-1.5 font-mono text-xs opacity-80">{count}</span>}
        </Badge>
      );
    })}
  </div>
);

export default DifficultyFilter;
