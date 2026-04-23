import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, AlertTriangle, TrendingUp } from "lucide-react";

const PrizeBudgetCard = () => {
  const { data } = useQuery({
    queryKey: ["prize-budget-status"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const [approvedRes, pendingRes, budgetRes] = await Promise.all([
        supabase
          .from("prize_redemptions")
          .select("points_spent, prizes!inner(dollar_value)")
          .in("status", ["approved", "fulfilled"])
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd),
        supabase
          .from("prize_redemptions")
          .select("points_spent, prizes!inner(dollar_value)")
          .eq("status", "pending")
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "monthly_prize_budget")
          .maybeSingle(),
      ]);

      const budget = parseFloat(budgetRes.data?.value ?? "1500");
      const approvedSpend = (approvedRes.data ?? []).reduce(
        (sum: number, r: any) => sum + (Number(r.prizes?.dollar_value) || 0),
        0,
      );
      const pendingSpend = (pendingRes.data ?? []).reduce(
        (sum: number, r: any) => sum + (Number(r.prizes?.dollar_value) || 0),
        0,
      );

      return {
        budget,
        approvedSpend,
        pendingSpend,
        approvedCount: approvedRes.data?.length ?? 0,
        pendingCount: pendingRes.data?.length ?? 0,
      };
    },
    staleTime: 60_000,
  });

  if (!data) return null;

  const totalProjected = data.approvedSpend + data.pendingSpend;
  const pct = data.budget > 0 ? Math.min((data.approvedSpend / data.budget) * 100, 100) : 0;
  const projectedPct = data.budget > 0 ? Math.min((totalProjected / data.budget) * 100, 100) : 0;
  const isWarning = pct >= 80;
  const isOver = pct >= 100;

  return (
    <Card className={isOver ? "border-destructive/50" : isWarning ? "border-warning/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-heading text-muted-foreground">
          Monthly Prize Budget
        </CardTitle>
        <DollarSign className={`h-5 w-5 ${isOver ? "text-destructive" : isWarning ? "text-warning" : "text-emerald-400"}`} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-display font-bold">
            ${data.approvedSpend.toFixed(0)}
          </span>
          <span className="text-sm text-muted-foreground">
            / ${data.budget.toFixed(0)}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{data.approvedCount} approved</span>
          <span>{data.pendingCount} pending</span>
        </div>
        {data.pendingSpend > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Projected: ${totalProjected.toFixed(0)} ({projectedPct.toFixed(0)}%)
          </div>
        )}
        {isWarning && !isOver && (
          <Alert variant="default" className="border-warning/40 bg-warning/5 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <AlertDescription className="text-xs">
              Budget is at {pct.toFixed(0)}% — approaching the ${data.budget} monthly cap.
            </AlertDescription>
          </Alert>
        )}
        {isOver && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">
              Budget exceeded! Approved spend is over the ${data.budget} monthly cap.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PrizeBudgetCard;
