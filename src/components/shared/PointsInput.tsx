import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Sparkles, Lock } from "lucide-react";
import { usePointsRubric } from "@/hooks/usePointsRubric";
import { validatePoints, type ItemKind } from "@/lib/pointsRubric";
import { useAuth } from "@/contexts/AuthContext";

interface PointsInputProps {
  kind: ItemKind;
  difficulty?: string | null;
  type?: string | null;
  placement?: "participation" | "first" | "second" | "third";
  value: number;
  onChange: (value: number) => void;
  overrideReason?: string | null;
  onOverrideReasonChange?: (reason: string) => void;
  label?: string;
  min?: number;
}

const PointsInput = ({
  kind,
  difficulty,
  type,
  placement,
  value,
  onChange,
  overrideReason,
  onOverrideReasonChange,
  label = "Points",
  min = 0,
}: PointsInputProps) => {
  const { isAdmin } = useAuth();
  const { data: rubric } = usePointsRubric();

  const result = useMemo(
    () => (rubric ? validatePoints(rubric, kind, difficulty, type, value, placement) : null),
    [rubric, kind, difficulty, type, value, placement],
  );

  const showOverride = !!result && !result.ok;
  const enforceBlocked = rubric?.enforcement === "enforce" && showOverride && !overrideReason?.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {result && (
          <span className="text-xs text-muted-foreground">
            Recommended: <span className="font-mono text-primary">{result.recommended}</span>
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          min={min}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className={result && !result.ok ? "border-warning" : ""}
        />
        {result && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => onChange(result.recommended)}
            disabled={value === result.recommended}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Use recommended
          </Button>
        )}
      </div>

      {result?.warning && (
        <Alert variant="default" className="border-warning/40 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-xs">{result.warning}</AlertDescription>
        </Alert>
      )}

      {showOverride && onOverrideReasonChange && (
        <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs font-heading">
            {isAdmin ? (
              <Switch
                checked={!!overrideReason}
                onCheckedChange={(v) => onOverrideReasonChange(v ? (overrideReason || " ") : "")}
              />
            ) : (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>{isAdmin ? "Override rubric (admin)" : "Admin-only override"}</span>
          </div>
          {isAdmin && (
            <Textarea
              value={overrideReason ?? ""}
              onChange={(e) => onOverrideReasonChange(e.target.value)}
              placeholder="Reason for deviating from the rubric (required to save)"
              className="text-xs min-h-[60px]"
            />
          )}
          {enforceBlocked && (
            <p className="text-xs text-destructive">An override reason is required in enforce mode.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PointsInput;
