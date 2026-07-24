import { useSearchParams } from "react-router-dom";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import CloudGamingConfigCard from "@/components/tenant/CloudGamingConfigCard";
import CloudGamingSeatsCard from "@/components/tenant/CloudGamingSeatsCard";
import { useTenantCloudGaming } from "@/hooks/useTenantCloudGaming";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings as SettingsIcon } from "lucide-react";
import TenantBranding from "./TenantBranding";

const VALID_TABS = ["brand", "platform"] as const;
type TabId = (typeof VALID_TABS)[number];

const TenantSettings = () => {
  const { tenantInfo } = useTenantAdmin();
  const { config: cloudGamingConfig } = useTenantCloudGaming(tenantInfo?.tenantId);
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "brand";

  if (!tenantInfo) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your brand guide and platform integrations.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const next = new URLSearchParams(searchParams);
          next.set("tab", v);
          setSearchParams(next, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="brand">Brand Guide</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="mt-6">
          <TenantBranding embedded />
        </TabsContent>

        <TabsContent value="platform" className="mt-6 space-y-6 max-w-2xl">
          <CloudGamingConfigCard tenantId={tenantInfo.tenantId} />
          {cloudGamingConfig?.is_enabled && (
            <CloudGamingSeatsCard tenantId={tenantInfo.tenantId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantSettings;
