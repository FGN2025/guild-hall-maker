import { CheckCircle2, Circle, Upload, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description?: string;
  display_order: number;
  verification_type?: "manual" | "steam_achievement" | "steam_playtime" | null;
  steam_achievement_api_name?: string | null;
  steam_playtime_minutes?: number | null;
}

interface TaskChecklistProps {
  tasks: Task[];
  evidenceTaskIds: Set<string>;
  onUploadEvidence: (taskId: string) => void;
  canUpload: boolean;
}

const TaskChecklist = ({ tasks, evidenceTaskIds, onUploadEvidence, canUpload }: TaskChecklistProps) => {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-foreground">Tasks</h3>
      <div className="space-y-1.5">
        {tasks.map((task) => {
          const hasEvidence = evidenceTaskIds.has(task.id);
          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                hasEvidence ? "border-green-500/30 bg-green-500/5" : "border-border"
              }`}
            >
              {hasEvidence ? (
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium flex items-center gap-1.5 ${hasEvidence ? "text-green-400" : "text-foreground"}`}>
                  {task.title}
                  {(task.verification_type === "steam_achievement" || task.verification_type === "steam_playtime") && (
                    <Gamepad2
                      className="h-3.5 w-3.5 text-primary shrink-0"
                      aria-label="Auto-verified via Steam"
                    >
                      <title>Auto-verified via Steam</title>
                    </Gamepad2>
                  )}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                )}
              </div>
              {canUpload && !hasEvidence && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => onUploadEvidence(task.id)}
                >
                  <Upload className="h-3 w-3" /> Upload
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskChecklist;
