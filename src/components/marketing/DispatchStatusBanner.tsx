import { AlertTriangle, PauseCircle, Gauge } from "lucide-react";
import { useDispatchControls, useTenantPublishUsage, quotaFor } from "@/hooks/useDispatchControls";

/**
 * Makes an active publishing kill switch or an exhausted publish quota visible
 * to the humans who would otherwise only see posts quietly not going out.
 * Renders nothing when both controls are inactive (the default).
 */
export default function DispatchStatusBanner({ tenantId }: { tenantId?: string | null }) {
  const { controls } = useDispatchControls();
  const { data: usage } = useTenantPublishUsage(tenantId);

  if (!controls) return null;

  const dailyLimit = quotaFor(controls.quotaDaily, tenantId);
  const monthlyLimit = quotaFor(controls.quotaMonthly, tenantId);
  const dailyHit = dailyLimit !== null && (usage?.daily ?? 0) >= dailyLimit;
  const monthlyHit = monthlyLimit !== null && (usage?.monthly ?? 0) >= monthlyLimit;

  if (!controls.killSwitchOn && !dailyHit && !monthlyHit && dailyLimit === null && monthlyLimit === null) {
    return null;
  }

  return (
    <div className="space-y-2">
      {controls.killSwitchOn && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <PauseCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-foreground">Publishing is paused</p>
            <p className="text-muted-foreground">
              The dispatcher kill switch is on
              {controls.pausedSince ? ` since ${new Date(controls.pausedSince).toLocaleString()}` : ""}.
              Approved posts are held, not failed, and will go out when it is cleared. An admin can
              clear it in Settings.
            </p>
          </div>
        </div>
      )}

      {(dailyHit || monthlyHit) && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-foreground">Publish quota reached</p>
            <p className="text-muted-foreground">
              {dailyHit
                ? `Daily cap reached (${usage?.daily}/${dailyLimit}).`
                : `Monthly cap reached (${usage?.monthly}/${monthlyLimit}).`}{" "}
              Due posts are deferred, not failed, and resume when the quota resets or is raised.
            </p>
          </div>
        </div>
      )}

      {!controls.killSwitchOn && !dailyHit && !monthlyHit && (dailyLimit !== null || monthlyLimit !== null) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          <span>
            Publish quota:{" "}
            {dailyLimit !== null ? `${usage?.daily ?? 0}/${dailyLimit} today` : "no daily cap"}
            {" · "}
            {monthlyLimit !== null ? `${usage?.monthly ?? 0}/${monthlyLimit} this month` : "no monthly cap"}
          </span>
        </div>
      )}
    </div>
  );
}
