import { useState } from "react";
import { Plug } from "lucide-react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useTenantIntegrations, type TenantIntegration } from "@/hooks/useTenantIntegrations";
import IntegrationConfigCard from "@/components/tenant/IntegrationConfigCard";
import BillingConfigDialog from "@/components/tenant/BillingConfigDialog";

interface TenantIntegrationsProps {
  embedded?: boolean;
}

const availableIntegrations = [
  { name: "NISC", providerType: "nisc", description: "National Information Solutions Cooperative — sync subscribers from your NISC billing system." },
  { name: "GLDS", providerType: "glds", description: "GLDS billing system integration for subscriber data synchronization." },
  { name: "FGN Academy", providerType: "fgn_academy", description: "FGN Academy LMS — automatically sync challenge completions, points, and player progress to fgn.academy." },
];

const TenantIntegrations = ({ embedded }: TenantIntegrationsProps) => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId;
  const { integrations, saveIntegration, updateIntegration, triggerSync, deleteIntegration } = useTenantIntegrations(tenantId);

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<TenantIntegration | null>(null);
  const [selectedProviderType, setSelectedProviderType] = useState<string>("nisc");

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" /> Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect billing systems and learning platforms to your tenant.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableIntegrations.map((integ) => {
          const configured = integrations.find((i) => i.provider_type === integ.providerType);
          return (
            <IntegrationConfigCard
              key={integ.providerType}
              name={integ.name}
              providerType={integ.providerType}
              description={integ.description}
              isConfigured={!!configured}
              lastSyncAt={configured?.last_sync_at}
              lastSyncStatus={configured?.last_sync_status}
              lastSyncMessage={configured?.last_sync_message}
              onConfigure={
                integ.providerType === "fgn_academy" && configured
                  ? undefined
                  : () => {
                      if (integ.providerType === "nisc" || integ.providerType === "glds") {
                        setSelectedIntegration(configured || null);
                        setSelectedProviderType(integ.providerType);
                        setConfigDialogOpen(true);
                      } else if (integ.providerType === "fgn_academy" && !configured && tenantId) {
                        saveIntegration.mutate({
                          tenant_id: tenantId,
                          provider_type: "fgn_academy",
                          display_name: "FGN Academy",
                          additional_config: {},
                        });
                      }
                    }
              }
              onSync={configured && integ.providerType !== "fgn_academy" ? () => triggerSync.mutate({ integrationId: configured.id, providerType: integ.providerType }) : undefined}
              isSyncing={triggerSync.isPending}
              onDisconnect={configured ? () => deleteIntegration.mutate(configured.id) : undefined}
              isDisconnecting={deleteIntegration.isPending}
            />
          );
        })}
      </div>

      {tenantId && (
        <BillingConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          tenantId={tenantId}
          providerType={selectedProviderType}
          existing={selectedIntegration}
          onSave={(data) => { saveIntegration.mutate(data as any, { onSuccess: () => setConfigDialogOpen(false) }); }}
          onUpdate={(id, fields) => { updateIntegration.mutate({ id, ...fields } as any, { onSuccess: () => setConfigDialogOpen(false) }); }}
          onTestConnection={async (integrationId) => {
            const result = await triggerSync.mutateAsync({ integrationId, dryRun: true, providerType: selectedProviderType });
            return result;
          }}
          isSaving={saveIntegration.isPending || updateIntegration.isPending}
        />
      )}
    </div>
  );
};

export default TenantIntegrations;
