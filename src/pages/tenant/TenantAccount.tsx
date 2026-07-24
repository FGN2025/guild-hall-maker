import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantBilling } from "@/hooks/useTenantBilling";
import TenantBillingCard from "@/components/tenant/TenantBillingCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const TenantAccount = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { tenantInfo, isPlatformAdminMode } = useTenantAdmin();
  const { isAdmin, roleLoading } = useAuth();
  const { isSubscribed } = useTenantBilling();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Subscription activated! Your billing is now set up.");
      searchParams.delete("checkout");
      setSearchParams(searchParams, { replace: true });
    } else if (checkout === "canceled") {
      toast.info("Checkout canceled. No charges were made.");
      searchParams.delete("checkout");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (!tenantInfo) return null;

  const canManageBilling = !roleLoading && isAdmin && isPlatformAdminMode;

  return (
    <div className="space-y-6 max-w-2xl">
      {!embedded && (
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your subscription and billing for {tenantInfo.tenantName}.
          </p>
        </div>
      )}


      {canManageBilling && !isSubscribed && <TenantBillingCard />}

      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Subscription Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {tenantInfo.tenantName} is subscribed to Tenant Basic. All tenant features are unlocked.
            </p>
          </CardContent>
        </Card>
      )}

      {!canManageBilling && !isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contact a platform administrator to manage this tenant's subscription.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenantAccount;
