import { useState } from "react";
import { CheckCircle2, Circle, Upload, Gamepad2, Loader2, AlertCircle, Clock, Info, Link2Off, Lock, Trophy, Timer, WifiOff, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description?: string;
  display_order: number;
  verification_type?: string | null;
  steam_achievement_api_name?: string | null;
  steam_playtime_minutes?: number | null;
}

interface EvidenceLite {
  task_id?: string | null;
  status?: string | null;
  file_type?: string | null;
  reviewer_notes?: string | null;
  notes?: string | null;
}

interface TaskChecklistProps {
  tasks: Task[];
  evidenceTaskIds: Set<string>;
  /** Optional richer evidence lookup, keyed by task_id, used to render verification status. */
  evidenceByTask?: Map<string, EvidenceLite>;
  /** Required for the inline "Re-check Steam" action. */
  enrollmentId?: string;
  /** Whether the parent challenge has a Steam-enabled game (steam_app_id present). */
  steamEnabled?: boolean;
  /** Called after a successful Steam re-check so the parent can refetch. */
  onSteamRecheck?: () => void;
  onUploadEvidence: (taskId: string) => void;
  canUpload: boolean;
}

const isSteamTask = (t: Task) =>
  t.verification_type === "steam_achievement" || t.verification_type === "steam_playtime";

const TaskChecklist = ({
  tasks,
  evidenceTaskIds,
  evidenceByTask,
  enrollmentId,
  steamEnabled,
  onSteamRecheck,
  onUploadEvidence,
  canUpload,
}: TaskChecklistProps) => {
  const [checkingTaskId, setCheckingTaskId] = useState<string | null>(null);
  const [lastFailure, setLastFailure] = useState<Record<string, { code: string; message: string; details?: any }>>({});

  if (tasks.length === 0) return null;

  const friendlyFor = (
    code: string,
    fallback: string,
    details?: any
  ): { title: string; message: string; Icon: typeof AlertCircle; tone: "warn" | "error" | "info"; actionHref?: string; actionLabel?: string } => {
    switch (code) {
      case "not_linked":
        return {
          title: "Steam account not linked",
          message: "Link your Steam account to enable auto-verification.",
          Icon: Link2Off,
          tone: "warn",
          actionHref: "/profile-settings",
          actionLabel: "Link Steam",
        };
      case "profile_private":
        return {
          title: "Steam profile is private",
          message: "Set your Steam profile and game details to public, then try again.",
          Icon: Lock,
          tone: "warn",
        };
      case "achievement_locked":
        return {
          title: "Achievement not unlocked",
          message: details?.achievement
            ? `Unlock "${details.achievement}" in-game, then re-check.`
            : "Unlock the required achievement in-game, then re-check.",
          Icon: Trophy,
          tone: "warn",
        };
      case "insufficient_playtime":
        return {
          title: "Not enough playtime yet",
          message:
            typeof details?.remaining === "number"
              ? `${details.minutes}/${details.required} min played — ${details.remaining} more to go.`
              : fallback,
          Icon: Timer,
          tone: "warn",
        };
      case "game_not_owned":
        return {
          title: "Game not in library",
          message: "We couldn't find this game in your Steam library, or it's hidden by privacy settings.",
          Icon: ShieldAlert,
          tone: "warn",
        };
      case "api_error":
        return {
          title: "Steam is unreachable",
          message: "Steam didn't respond. Wait a moment and try again.",
          Icon: WifiOff,
          tone: "error",
        };
      default:
        return {
          title: "Not verified yet",
          message: fallback || "Criteria not met yet.",
          Icon: AlertCircle,
          tone: "warn",
        };
    }
  };

  const handleSteamCheck = async (taskId: string) => {
    if (!enrollmentId) return;
    setCheckingTaskId(taskId);
    try {
      const { data, error } = await supabase.functions.invoke("verify-steam-task-completion", {
        body: { taskId, enrollmentId },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(data.alreadyApproved ? "Already auto-approved." : "Auto-approved from Steam!");
        setLastFailure((p) => {
          const { [taskId]: _omit, ...rest } = p;
          return rest;
        });
        onSteamRecheck?.();
      } else {
        const code = data?.reasonCode || "not_met";
        const friendly = friendlyFor(code, data?.reason || "", data?.details);
        setLastFailure((p) => ({ ...p, [taskId]: { code, message: friendly.message, details: data?.details } }));
        toast.message(friendly.title, { description: friendly.message });
      }
    } catch (err: any) {
      const msg = err?.message || "Steam API error";
      setLastFailure((p) => ({ ...p, [taskId]: { code: "api_error", message: msg } }));
      toast.error("Steam is unreachable", { description: msg });
    } finally {
      setCheckingTaskId(null);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-foreground">Tasks</h3>
      <div className="space-y-1.5">
        {tasks.map((task) => {
          const hasEvidence = evidenceTaskIds.has(task.id);
          const ev = evidenceByTask?.get(task.id);
          const steam = isSteamTask(task);
          const autoApproved = steam && ev?.status === "approved" && ev?.file_type === "steam_auto";
          const status = ev?.status;
          const transientReason = lastReason[task.id];
          const checking = checkingTaskId === task.id;

          // Build verification status block (Steam-only)
          let statusBlock: React.ReactNode = null;
          if (steam) {
            if (autoApproved) {
              statusBlock = (
                <div className="mt-2 flex items-start gap-1.5 rounded-md border border-green-500/30 bg-green-500/5 px-2 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-green-300 leading-snug">
                    Auto-verified via Steam.{" "}
                    {task.verification_type === "steam_achievement"
                      ? `Achievement "${task.steam_achievement_api_name}" unlocked.`
                      : `Playtime ≥ ${task.steam_playtime_minutes} min confirmed.`}
                  </p>
                </div>
              );
            } else if (hasEvidence && status === "pending") {
              statusBlock = (
                <div className="mt-2 flex items-start gap-1.5 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-2 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-yellow-200 leading-snug">
                    Manual evidence submitted — awaiting moderator review.
                  </p>
                </div>
              );
            } else if (hasEvidence && status === "rejected") {
              statusBlock = (
                <div className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                  <p className="text-[11px] text-destructive leading-snug">
                    Rejected{ev?.reviewer_notes ? `: ${ev.reviewer_notes}` : "."} Re-run a Steam check or upload new evidence.
                  </p>
                </div>
              );
            } else if (!steamEnabled) {
              statusBlock = (
                <div className="mt-2 flex items-start gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    This game has no Steam App ID — upload manual evidence instead.
                  </p>
                </div>
              );
            } else {
              // Pending Steam verification
              const target =
                task.verification_type === "steam_achievement"
                  ? `Needs achievement: "${task.steam_achievement_api_name}"`
                  : `Needs playtime ≥ ${task.steam_playtime_minutes} min`;
              statusBlock = (
                <div className="mt-2 space-y-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
                  <div className="flex items-start gap-1.5">
                    <Gamepad2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground leading-snug">{target}</p>
                      {transientReason && (
                        <p className="text-[11px] text-yellow-300 leading-snug mt-0.5">{transientReason}</p>
                      )}
                    </div>
                  </div>
                  {canUpload && enrollmentId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1 w-full"
                      onClick={() => handleSteamCheck(task.id)}
                      disabled={checking}
                    >
                      {checking ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Gamepad2 className="h-3 w-3" />
                      )}
                      {checking ? "Checking Steam..." : "Re-check Steam now"}
                    </Button>
                  )}
                </div>
              );
            }
          }

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
                  {steam && (
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
                {statusBlock}
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
