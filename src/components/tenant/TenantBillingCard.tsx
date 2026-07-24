import { useTenantBilling } from "@/hooks/useTenantBilling";
import { TENANT_PLANS, STRIPE_PRODUCTS, type TenantPlanTier } from "@/lib/stripeProducts";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2, RefreshCw, Check, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  trialing: { label: "Trial", variant: "secondary" },
  past_due: { label: "Past Due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "destructive" },
  incomplete: { label: "Incomplete", variant: "outline" },
  unpaid: { label: "Unpaid", variant: "destructive" },
};

const TenantBillingCard = () => {
  const { tenantInfo } = useTenantAdmin();
  const {
    subscription,
    isSubscribed,
    isLoading,
    actionLoading,
    subscribe,
    managePortal,
    checkSubscription,
  } = useTenantBilling();

  const { data: tenantRow } = useQuery({
    queryKey: ["tenant-plan-tier", tenantInfo?.tenantId],
    enabled: !!tenantInfo?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("plan_tier")
        .eq("id", tenantInfo!.tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as { plan_tier: TenantPlanTier | null } | null;
    },
  });

  const currentTier: TenantPlanTier | null = tenantRow?.plan_tier ?? null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  const status = subscription?.status ?? null;
  const config = status ? statusConfig[status] ?? { label: status, variant: "outline" as const } : null;
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Billing
          </CardTitle>
          {config && <Badge variant={config.variant}>{config.label}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSubscribed && renewalDate && (
          <p className="text-sm text-muted-foreground">
            Renews on <span className="text-foreground">{renewalDate}</span>
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {TENANT_PLANS.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            const canUpgrade = currentTier === "basic" && plan.tier === "pro";
            const canDowngrade = currentTier === "pro" && plan.tier === "basic";
            const label = isCurrent
              ? "Current Plan"
              : canUpgrade
              ? "Upgrade"
              : canDowngrade
              ? "Downgrade"
              : "Subscribe";
            const Icon = isCurrent ? Check : canUpgrade ? ArrowUpCircle : canDowngrade ? ArrowDownCircle : CreditCard;
            return (
              <div
                key={plan.tier}
                className={`border rounded-lg p-4 space-y-3 ${isCurrent ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-foreground">{plan.name}</h3>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${(plan.amount / 100).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
                </p>
                <p className="text-xs text-muted-foreground min-h-[2.5rem]">{plan.description}</p>
                <Button
                  onClick={() => subscribe(plan.price_id)}
                  disabled={!!actionLoading || isCurrent}
                  variant={isCurrent ? "outline" : canUpgrade ? "default" : "secondary"}
                  className="w-full gap-2"
                  size="sm"
                >
                  {actionLoading === "subscribe" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {label}
                </Button>
              </div>
            );
          })}
        </div>

        {subscription && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={managePortal} disabled={!!actionLoading} className="gap-2">
              {actionLoading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage Subscription
            </Button>
            <Button variant="ghost" size="icon" onClick={checkSubscription} title="Refresh status">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground pt-1">
          Plan tier is set by your platform administrator. Contact support to switch plans while Stripe wiring is being finalized.
        </p>
      </CardContent>
    </Card>
  );
};

export default TenantBillingCard;
