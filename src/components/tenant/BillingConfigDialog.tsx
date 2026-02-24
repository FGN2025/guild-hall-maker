import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, AlertCircle, Wifi } from "lucide-react";
import type { TenantIntegration } from "@/hooks/useTenantIntegrations";

interface ProviderMeta {
  key: string;
  label: string;
  description: string;
  urlPlaceholder: string;
}

const PROVIDERS: Record<string, ProviderMeta> = {
  nisc: {
    key: "nisc",
    label: "NISC",
    description: "Connect to your NISC billing system to sync subscriber data automatically.",
    urlPlaceholder: "https://your-nisc-instance.com/api",
  },
  glds: {
    key: "glds",
    label: "GLDS",
    description: "Connect to your GLDS billing system to sync subscriber data automatically.",
    urlPlaceholder: "https://your-glds-instance.com/api",
  },
};

interface BillingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  providerType: string;
  existing?: TenantIntegration | null;
  onSave: (data: {
    tenant_id: string;
    provider_type: string;
    display_name?: string;
    api_url?: string;
    api_key_encrypted?: string;
    is_active?: boolean;
    additional_config?: Record<string, unknown>;
  }) => void;
  onUpdate?: (id: string, data: {
    display_name?: string;
    api_url?: string;
    api_key_encrypted?: string;
    is_active?: boolean;
    additional_config?: Record<string, unknown>;
  }) => void;
  onTestConnection?: (integrationId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  isSaving?: boolean;
}

const BillingConfigDialog = ({
  open,
  onOpenChange,
  tenantId,
  providerType,
  existing,
  onSave,
  onUpdate,
  onTestConnection,
  isSaving,
}: BillingConfigDialogProps) => {
  const provider = PROVIDERS[providerType] ?? { key: providerType, label: providerType.toUpperCase(), description: "Configure this billing integration.", urlPlaceholder: "https://api.example.com" };

  const [displayName, setDisplayName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

  const isEdit = !!existing;

  useEffect(() => {
    if (open) {
      setDisplayName(existing?.display_name || "");
      setApiUrl(existing?.api_url || "");
      setApiKey("");
      setIsActive(existing?.is_active ?? true);
      setTestResult(null);
    }
  }, [open, existing]);

  const handleSave = () => {
    if (isEdit && onUpdate && existing) {
      const payload: Record<string, unknown> = {
        display_name: displayName || provider.label,
        api_url: apiUrl,
        is_active: isActive,
      };
      if (apiKey) payload.api_key_encrypted = apiKey;
      onUpdate(existing.id, payload);
    } else {
      onSave({
        tenant_id: tenantId,
        provider_type: providerType,
        display_name: displayName || provider.label,
        api_url: apiUrl,
        api_key_encrypted: apiKey || undefined,
        is_active: isActive,
      });
    }
  };

  const handleTest = async () => {
    if (!onTestConnection || !existing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTestConnection(existing.id);
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: "Connection test failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${provider.label} Integration` : `Configure ${provider.label} Integration`}</DialogTitle>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="billing-display-name">Display Name</Label>
            <Input
              id="billing-display-name"
              placeholder={provider.label}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-api-url">API URL <span className="text-destructive">*</span></Label>
            <Input
              id="billing-api-url"
              placeholder={provider.urlPlaceholder}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-api-key">
              API Key {isEdit ? "(leave blank to keep current)" : ""}
            </Label>
            <Input
              id="billing-api-key"
              type="password"
              placeholder={isEdit ? "••••••••" : "Enter API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="billing-active">Active</Label>
            <Switch id="billing-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {isEdit && existing?.last_sync_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-3 bg-muted/30">
              {existing.last_sync_status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
              <span>
                Last sync: {new Date(existing.last_sync_at).toLocaleString()}
                {existing.last_sync_message && ` — ${existing.last_sync_message}`}
              </span>
            </div>
          )}

          {testResult && (
            <div className={`flex items-center gap-2 text-sm border rounded-md p-3 ${testResult.success ? "bg-green-500/10 border-green-500/30 text-green-700" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{testResult.message || (testResult.success ? "Connection successful" : "Connection failed")}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEdit && (
            <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Test Connection
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={!apiUrl || isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BillingConfigDialog;
