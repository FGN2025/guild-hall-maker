import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Strength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): { strength: Strength; score: number; feedback: string } {
  if (!password) return { strength: "weak", score: 0, feedback: "" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { strength: "weak", score, feedback: "Weak — add uppercase, numbers, or symbols" };
  if (score <= 3) return { strength: "medium", score, feedback: "Medium — almost there" };
  return { strength: "strong", score, feedback: "Strong password" };
}

const strengthConfig: Record<Strength, { color: string; bars: number }> = {
  weak: { color: "bg-destructive", bars: 1 },
  medium: { color: "bg-yellow-500", bars: 2 },
  strong: { color: "bg-green-500", bars: 3 },
};

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const PasswordStrengthIndicator = ({ password, className }: PasswordStrengthIndicatorProps) => {
  const { strength, feedback } = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  const config = strengthConfig[strength];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= config.bars ? config.color : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-body">{feedback}</p>
    </div>
  );
};

export { PasswordStrengthIndicator };
