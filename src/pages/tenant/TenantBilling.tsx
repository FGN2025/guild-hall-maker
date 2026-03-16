import TenantBillingCard from "@/components/tenant/TenantBillingCard";

const TenantBilling = () => {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and billing details.
        </p>
      </div>
      <TenantBillingCard />
    </div>
  );
};

export default TenantBilling;
