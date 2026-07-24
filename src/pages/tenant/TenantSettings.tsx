import { Link } from "react-router-dom";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import CloudGamingConfigCard from "@/components/tenant/CloudGamingConfigCard";
import CloudGamingSeatsCard from "@/components/tenant/CloudGamingSeatsCard";
import { useTenantCloudGaming } from "@/hooks/useTenantCloudGaming";

const TenantSettings = () => {
  const { tenantInfo } = useTenantAdmin();
  const { config: cloudGamingConfig } = useTenantCloudGaming(tenantInfo?.tenantId);

  if (!tenantInfo) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cloud gaming and platform integrations. For logo, colors, and company info, visit{" "}
          <Link to="/tenant/branding" className="underline text-primary">Branding &amp; Banner</Link>.
        </p>
      </div>

      <CloudGamingConfigCard tenantId={tenantInfo.tenantId} />
      {cloudGamingConfig?.is_enabled && (
        <CloudGamingSeatsCard tenantId={tenantInfo.tenantId} />
      )}
    </div>
  );
};

export default TenantSettings;
