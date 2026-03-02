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
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Wifi } from "lucide-react";
import type { TenantIntegration } from "@/hooks/useTenantIntegrations";

interface NISCConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
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

const NISCConfigDialog = ({
  open,
  onOpenChange,
  tenantId,
  existing,
  onSave,
  onUpdate,
  onTestConnection,
  isSaving,
}: NISCConfigDialogProps) => {
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
        display_name: displayName || "NISC",
        api_url: apiUrl,
        is_active: isActive,
      };
      if (apiKey) payload.api_key_encrypted = apiKey;
      onUpdate(existing.id, payload);
    } else {
      onSave({
        tenant_id: tenantId,
        provider_type: "nisc",
        display_name: displayName || "NISC",
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
          <DialogTitle>{isEdit ? "Edit NISC Integration" : "Configure NISC Integration"}</DialogTitle>
          <DialogDescription>
            Connect to your NISC billing system to sync subscriber data automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nisc-display-name">Display Name</Label>
            <Input
              id="nisc-display-name"
              placeholder="NISC"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nisc-api-url">API URL <span className="text-destructive">*</span></Label>
            <Input
              id="nisc-api-url"
              placeholder="https://your-nisc-instance.com/api"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nisc-api-key">
              API Key {isEdit ? "(leave blank to keep current)" : ""}
            </Label>
            <PasswordInput
              id="nisc-api-key"
              placeholder={isEdit ? "••••••••" : "Enter API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="nisc-active">Active</Label>
            <Switch
              id="nisc-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
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
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
              className="gap-2"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Test Connection
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!apiUrl || isSaving}
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NISCConfigDialog;
