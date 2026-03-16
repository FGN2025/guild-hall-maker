import { useTenantBilling } from "@/hooks/useTenantBilling";
import { STRIPE_PRODUCTS } from "@/lib/stripeProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2, RefreshCw } from "lucide-react";
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
  const {
    subscription,
    isSubscribed,
    isLoading,
    actionLoading,
    subscribe,
    managePortal,
    checkSubscription,
  } = useTenantBilling();

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

  const plan = STRIPE_PRODUCTS.tenant_basic;
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
        {!subscription ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">
                Subscribe to <span className="font-semibold text-foreground">{plan.name}</span> to unlock all tenant features.
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                ${(plan.amount / 100).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
              </p>
            </div>
            <Button onClick={() => subscribe()} disabled={!!actionLoading} className="gap-2">
              {actionLoading === "subscribe" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Subscribe
            </Button>
          </>
        ) : isSubscribed ? (
          <>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Current plan: <span className="font-semibold text-foreground">{plan.name}</span>
              </p>
              {renewalDate && (
                <p className="text-sm text-muted-foreground">
                  Renews on <span className="text-foreground">{renewalDate}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={managePortal} disabled={!!actionLoading} className="gap-2">
                {actionLoading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Manage Subscription
              </Button>
              <Button variant="ghost" size="icon" onClick={checkSubscription} title="Refresh status">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Your subscription is <span className="font-semibold text-destructive">{config?.label?.toLowerCase()}</span>. Update your payment to restore access.
            </p>
            <div className="flex gap-2">
              <Button onClick={managePortal} disabled={!!actionLoading} className="gap-2">
                {actionLoading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Update Payment
              </Button>
              <Button variant="ghost" size="icon" onClick={checkSubscription} title="Refresh status">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantBillingCard;
