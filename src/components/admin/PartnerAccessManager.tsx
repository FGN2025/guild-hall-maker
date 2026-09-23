import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Loader2, Copy, Ban, RefreshCw, Save } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CAPABILITIES = ["catalog:read", "activities:read", "relationships:read"];
const CONTRACT_VERSION = "2026-09-23.1";

interface PartnerKey {
  id: string;
  label: string;
  key_prefix: string;
  tenant_id: string;
  capabilities: string[];
  include_inactive: boolean;
  rate_limit_per_minute: number;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface TenantOption { id: string; name: string }

async function sha256Hex(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function mintKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "fgnk_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PartnerAccessManager = () => {
  const [keys, setKeys] = useState<PartnerKey[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<PartnerKey | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const [label, setLabel] = useState("FGN Studio");
  const [tenantId, setTenantId] = useState("");
  const [caps, setCaps] = useState<string[]>(CAPABILITIES);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState("90");

  const [origins, setOrigins] = useState("");
  const [savingOrigins, setSavingOrigins] = useState(false);

  const baseUrl = useMemo(
    () => `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/studio-api`,
    [],
  );

  const load = async () => {
    setLoading(true);
    const [k, t, s] = await Promise.all([
      supabase.from("partner_api_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, name").order("name"),
      supabase.from("app_settings").select("value").eq("key", "studio_allowed_origins").maybeSingle(),
    ]);
    if (k.error) toast({ title: "Could not load partner keys", description: k.error.message, variant: "destructive" });
    setKeys((k.data as PartnerKey[]) ?? []);
    setTenants((t.data as TenantOption[]) ?? []);
    setOrigins(s.data?.value ?? "");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!tenantId) {
      toast({ title: "Pick an organization", description: "A partner key must be scoped to one organization.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const raw = mintKey();
      const days = Number(expiresInDays);
      const { error } = await supabase.from("partner_api_keys").insert({
        label,
        key_hash: await sha256Hex(raw),
        key_prefix: raw.slice(0, 12),
        tenant_id: tenantId,
        capabilities: caps,
        include_inactive: includeInactive,
        expires_at: Number.isFinite(days) && days > 0
          ? new Date(Date.now() + days * 86400000).toISOString()
          : null,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      });
      if (error) throw error;
      setNewKeyValue(raw);
      await load();
    } catch (e: any) {
      toast({ title: "Could not create key", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    const { error } = await supabase
      .from("partner_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", revokeTarget.id);
    if (error) {
      toast({ title: "Could not revoke", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Key revoked", description: "Existing sessions from this key stop working immediately." });
      await load();
    }
    setRevokeTarget(null);
  };

  const saveOrigins = async () => {
    setSavingOrigins(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: origins, updated_at: new Date().toISOString() })
      .eq("key", "studio_allowed_origins");
    setSavingOrigins(false);
    if (error) toast({ title: "Could not save", description: error.message, variant: "destructive" });
    else toast({ title: "Approved origins saved" });
  };

  const statusOf = (k: PartnerKey) => {
    if (k.revoked_at) return { label: "Revoked", variant: "destructive" as const };
    if (k.expires_at && new Date(k.expires_at) <= new Date()) return { label: "Expired", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card/90 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="h-5 w-5 text-primary" /> Partner Access (Studio read API)
          </h3>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Base URL <code className="text-xs">{baseUrl}</code> · contract <code className="text-xs">{CONTRACT_VERSION}</code>.
          Keys are scoped to one organization, shown once, and stored hashed. Give the key to the partner's server, never to a browser.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-card/90 p-4 backdrop-blur-sm md:grid-cols-2">
        <div className="space-y-2">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="FGN Studio" />
        </div>
        <div className="space-y-2">
          <Label>Organization scope</Label>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger><SelectValue placeholder="Select an organization" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Capabilities</Label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={caps.includes(c) ? "default" : "outline"}
                onClick={() => setCaps((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Expires in (days, blank for never)</Label>
          <Input value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Inactive records</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={includeInactive ? "default" : "outline"} onClick={() => setIncludeInactive(true)}>Visible</Button>
            <Button type="button" size="sm" variant={!includeInactive ? "default" : "outline"} onClick={() => setIncludeInactive(false)}>Hidden</Button>
          </div>
        </div>
        <div className="flex items-end">
          <Button onClick={createKey} disabled={creating} className="w-full">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Issue key
          </Button>
        </div>
      </div>

      {newKeyValue && (
        <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
          <p className="mb-2 text-sm font-medium">Copy this key now — it is never shown again.</p>
          <div className="flex gap-2">
            <Input readOnly value={newKeyValue} className="font-mono text-xs" />
            <Button
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(newKeyValue); toast({ title: "Copied" }); }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => setNewKeyValue(null)}>Done</Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card/90 p-4 backdrop-blur-sm">
        <h4 className="mb-3 font-semibold">Issued keys</h4>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No partner keys issued yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => {
              const s = statusOf(k);
              const tenant = tenants.find((t) => t.id === k.tenant_id);
              return (
                <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-black/20 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{k.label}</span>
                      <Badge variant={s.variant}>{s.label}</Badge>
                      <code className="text-xs text-muted-foreground">{k.key_prefix}…</code>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tenant?.name ?? k.tenant_id} · {k.capabilities.join(", ")} · inactive {k.include_inactive ? "visible" : "hidden"} ·{" "}
                      {k.expires_at ? `expires ${new Date(k.expires_at).toLocaleDateString()}` : "no expiry"} ·{" "}
                      {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleString()}` : "never used"}
                    </p>
                  </div>
                  {!k.revoked_at && (
                    <Button variant="destructive" size="sm" onClick={() => setRevokeTarget(k)}>
                      <Ban className="mr-2 h-4 w-4" /> Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card/90 p-4 backdrop-blur-sm">
        <h4 className="mb-2 font-semibold">Approved browser origins</h4>
        <p className="mb-3 text-sm text-muted-foreground">
          Comma-separated list of origins allowed to call the read API from a browser, e.g. https://studio.example.com
        </p>
        <div className="flex gap-2">
          <Input value={origins} onChange={(e) => setOrigins(e.target.value)} placeholder="https://studio.example.com" />
          <Button onClick={saveOrigins} disabled={savingOrigins}>
            {savingOrigins ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
          </Button>
        </div>
      </div>

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this partner key?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.label} stops working immediately, along with every short-lived session created from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revoke}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartnerAccessManager;
