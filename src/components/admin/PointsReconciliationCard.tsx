import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PointsReconciliationCard = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const run = async (dryRun: boolean) => {
    setLoading(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("reconcile-tournament-points", {
        body: { dry_run: dryRun },
      });
      if (error) throw error;
      setReport(data);
      toast.success(
        dryRun
          ? `Dry run complete: ${data.placements?.length ?? 0} placements, ${data.match_credits?.length ?? 0} match credits pending.`
          : `Backfill complete: ${data.placements?.length ?? 0} placements, ${data.match_credits?.length ?? 0} match credits applied.`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reconcile points");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Points Wallet Health
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={loading} onClick={() => run(true)}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Dry Run"}
          </Button>
          <Button size="sm" disabled={loading} onClick={() => run(false)}>
            Backfill Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Scans every completed tournament and match for missing point credits. Dry Run reports gaps without
          writing; Backfill credits players' wallets, idempotently.
        </p>
        {report && (
          <div className="space-y-3 text-xs font-mono">
            <div>
              <strong className="text-primary">Placement gaps ({report.placements?.length ?? 0}):</strong>
              {report.placements?.length > 0 && (
                <ul className="ml-4 list-disc text-muted-foreground max-h-40 overflow-auto">
                  {report.placements.slice(0, 50).map((p: any, i: number) => (
                    <li key={i}>
                      {p.name} — {p.status ?? `place ${p.place}: ${p.points} pts`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <strong className="text-primary">Match credit gaps ({report.match_credits?.length ?? 0}):</strong>
              {report.match_credits?.length > 0 && (
                <ul className="ml-4 list-disc text-muted-foreground max-h-40 overflow-auto">
                  {report.match_credits.slice(0, 50).map((c: any, i: number) => (
                    <li key={i}>
                      {c.tournament_name}: {c.kind} +{c.points} pts → {c.user_id.slice(0, 8)}…
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {report.errors?.length > 0 && (
              <div className="text-destructive">
                <strong>Errors:</strong>
                <ul className="ml-4 list-disc">
                  {report.errors.map((e: any, i: number) => (
                    <li key={i}>{JSON.stringify(e)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PointsReconciliationCard;
