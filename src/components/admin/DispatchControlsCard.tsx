import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { useDispatchControls, DISPATCH_KEYS } from "@/hooks/useDispatchControls";

/**
 * Admin controls for the publishing dispatcher: a kill switch and a per-tenant
 * publish quota. Both live in app_settings and are read at every dispatch tick,
 * so changes take effect within a minute with no deploy.
 *
 * Leaving the quota fields blank removes the keys entirely == unlimited, which
 * is the pre-existing behavior.
 */
export default function DispatchControlsCard() {
  const { controls, isLoading, setKey } = useDispatchControls();
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");

  useEffect(() => {
    if (!controls) return;
    setDaily(controls.quotaDaily.default != null ? String(controls.quotaDaily.default) : "");
    setMonthly(controls.quotaMonthly.default != null ? String(controls.quotaMonthly.default) : "");
  }, [controls?.raw[DISPATCH_KEYS.quotaDaily], controls?.raw[DISPATCH_KEYS.quotaMonthly]]);

  const saveQuotas = () => {
    setKey.mutate({ key: DISPATCH_KEYS.quotaDaily, value: daily.trim() === "" ? null : String(parseInt(daily)) });
    setKey.mutate({ key: DISPATCH_KEYS.quotaMonthly, value: monthly.trim() === "" ? null : String(parseInt(monthly)) });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <Label className="font-heading text-sm">Publishing Controls</Label>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
            <div className="space-y-1">
              <Label className="font-heading text-sm">Dispatcher kill switch</Label>
              <p className="text-xs text-muted-foreground">
                Stops all social publishing cleanly. Approved posts are held, never failed, and are
                picked up when this is cleared. The staleness guard is suspended while paused and
                widened afterwards so the backlog survives the pause.
                {controls?.pausedSince && (
                  <> Paused since {new Date(controls.pausedSince).toLocaleString()}.</>
                )}
              </p>
            </div>
            <Switch
              checked={!!controls?.killSwitchOn}
              onCheckedChange={(checked) =>
                setKey.mutate({ key: DISPATCH_KEYS.killSwitch, value: checked ? "on" : null })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-sm">Per-tenant publish quota</Label>
            <p className="text-xs text-muted-foreground">
              Caps actual dispatches per tenant. Separate from agent run limits, which govern seed
              runs. Over-quota posts defer, they do not fail. Blank means no cap.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-body">Max publishes per day</Label>
                <Input
                  type="number"
                  min={0}
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  placeholder="No cap"
                  className="bg-background border-border font-body"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-body">Max publishes per month</Label>
                <Input
                  type="number"
                  min={0}
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  placeholder="No cap"
                  className="bg-background border-border font-body"
                />
              </div>
            </div>
            <Button onClick={saveQuotas} disabled={setKey.isPending} className="font-heading mt-2">
              {setKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Quota
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
