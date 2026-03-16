import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ExternalLink, CheckCircle2 } from "lucide-react";
import { useTenantBilling, TENANT_TIERS } from "@/hooks/useTenantBilling";

const TenantBillingCard = () => {
  const {
    subscription,
    isLoading,
    currentTier,
    checkoutLoading,
    portalLoading,
    startCheckout,
    openPortal,
    refetch,
  } = useTenantBilling();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isSubscribed = subscription?.subscribed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> Billing & Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSubscribed ? (
          <>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-foreground">
                  {currentTier ? TENANT_TIERS[currentTier as keyof typeof TENANT_TIERS]?.name : "Active Subscription"}
                </p>
                {subscription?.subscription_end && (
                  <p className="text-sm text-muted-foreground">
                    Renews {new Date(subscription.subscription_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="ml-auto">Active</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading} className="gap-2">
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Manage Subscription
              </Button>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                Refresh Status
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Subscribe to unlock your full tenant dashboard including player management, events, marketing tools, and subscriber sync.
            </p>
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold">{TENANT_TIERS.basic.name}</h3>
                  <p className="text-sm text-muted-foreground">Dashboard, players, events, marketing, sync</p>
                </div>
                <p className="text-xl font-bold text-foreground">
                  ${TENANT_TIERS.basic.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
              </div>
              <Button
                onClick={() => startCheckout(TENANT_TIERS.basic.price_id)}
                disabled={checkoutLoading}
                className="w-full gap-2"
              >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Subscribe Now
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Refresh Status
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantBillingCard;
