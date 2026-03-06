import { useState, useEffect } from "react";
import { MapPin, KeyRound, Building2, CheckCircle2, AlertCircle, Info, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Provider {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  logo_url: string | null;
}

interface ZipCheckResult {
  valid: boolean;
  providers: Provider[];
  bypassed: boolean;
  message: string;
  noProvidersMessage?: string | null;
  noProviders?: boolean;
}

interface ZipCheckStepProps {
  zipCode: string;
  setZipCode: (v: string) => void;
  bypassCode: string;
  setBypassCode: (v: string) => void;
  result: ZipCheckResult | null;
  loading: boolean;
  onCheck: () => void;
  onProceed: (selectedTenantId?: string) => void;
}

const ZipCheckStep = ({
  zipCode,
  setZipCode,
  bypassCode,
  setBypassCode,
  result,
  loading,
  onCheck,
  onProceed,
}: ZipCheckStepProps) => {
  const checked = result !== null;
  const canProceed = checked && (result.valid || result.bypassed);
  const showNoProviderFallback = checked && result.noProviders && !result.bypassed && !result.valid;

  // ISP selection state
  const [selectedProvider, setSelectedProvider] = useState<string>("");

  // Auto-select if single provider
  useEffect(() => {
    if (result?.providers?.length === 1) {
      setSelectedProvider(result.providers[0].tenant_id);
    } else if (!result?.providers?.length) {
      setSelectedProvider("");
    }
  }, [result?.providers]);

  // Fallback invite code state
  const [fallbackCode, setFallbackCode] = useState("");
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState("");

  // Access request form state
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSubmitted, setReqSubmitted] = useState(false);

  const handleFallbackCodeCheck = async () => {
    if (!fallbackCode.trim()) return;
    setFallbackLoading(true);
    setFallbackError("");
    try {
      // Try platform bypass code first
      const { data, error } = await supabase.rpc("validate_bypass_code", {
        _code: fallbackCode.trim(),
      });
      if (error) throw error;
      if (data) {
        onProceed();
        return;
      }

      // Fallback: try tenant code validation (dry run)
      const { data: tcData, error: tcError } = await supabase.functions.invoke("validate-tenant-code", {
        body: { code: fallbackCode.trim(), dry_run: true },
      });
      if (!tcError && tcData?.valid) {
        if (tcData.code_type === "access") {
          // Access code grants immediate entry
          onProceed();
        } else {
          // Other types (campaign, tracking, verification, override) — allow proceed with attribution
          onProceed();
        }
        return;
      }

      setFallbackError("Invalid or expired invite code.");
    } catch (err: any) {
      setFallbackError(err.message || "Error validating code.");
    } finally {
      setFallbackLoading(false);
    }
  };

  const handleAccessRequest = async () => {
    const trimmedEmail = reqEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Email is required to request access.");
      return;
    }
    setReqSubmitting(true);
    try {
      // Check for existing pending or approved request with same email
      const { data: existing, error: checkError } = await supabase
        .from("access_requests" as any)
        .select("id, status")
        .eq("email", trimmedEmail)
        .in("status", ["pending", "approved"]) as any;
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        const status = existing[0].status;
        if (status === "pending") {
          toast.error("You already have a pending access request. An admin will review it soon.");
        } else {
          toast.error("Your request was already approved. Check your email for the invite code.");
        }
        return;
      }

      const { error } = await supabase.from("access_requests" as any).insert({
        email: trimmedEmail,
        display_name: reqName.trim() || null,
        zip_code: zipCode,
      } as any);
      if (error) throw error;
      setReqSubmitted(true);
      toast.success("Access request submitted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleContinue = () => {
    onProceed(selectedProvider || undefined);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="zipCode" className="font-heading text-sm text-foreground">
          ZIP Code <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="zipCode"
            type="text"
            placeholder="Enter your ZIP code"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="pl-10 bg-card border-border font-body"
            maxLength={5}
            disabled={canProceed}
          />
        </div>
      </div>

      {/* Initial bypass code (shown before check) */}
      {!checked && (
        <div className="space-y-2">
          <Label htmlFor="bypassCode" className="font-heading text-sm text-muted-foreground">
            Invite Code <span className="text-xs">(optional)</span>
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="bypassCode"
              type="text"
              placeholder="Have an invite code?"
              value={bypassCode}
              onChange={(e) => setBypassCode(e.target.value)}
              className="pl-10 bg-card border-border font-body"
              maxLength={50}
              disabled={canProceed}
            />
          </div>
        </div>
      )}

      {/* Result display with ISP selection */}
      {result && !showNoProviderFallback && (
        <div
          className={`rounded-lg p-4 text-sm border ${
            result.valid
              ? "bg-primary/5 border-primary/20 text-foreground"
              : "bg-destructive/5 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-start gap-2">
            {result.valid ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            )}
            <span>{result.message}</span>
          </div>

          {/* ISP Selection dropdown */}
          {result.providers.length > 1 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider">
                Select your provider
              </p>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Choose your internet provider" />
                </SelectTrigger>
                <SelectContent>
                  {result.providers.map((p) => (
                    <SelectItem key={p.tenant_id} value={p.tenant_id}>
                      <div className="flex items-center gap-2">
                        {p.logo_url ? (
                          <img src={p.logo_url} alt={p.tenant_name} className="h-5 w-5 rounded object-contain" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span>{p.tenant_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Single provider auto-selected display */}
          {result.providers.length === 1 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider">
                Your provider
              </p>
              <div className="flex items-center gap-3 p-2 rounded-md bg-card border border-border">
                {result.providers[0].logo_url ? (
                  <img
                    src={result.providers[0].logo_url}
                    alt={result.providers[0].tenant_name}
                    className="h-8 w-8 rounded object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground p-1" />
                )}
                <span className="font-heading text-sm">{result.providers[0].tenant_name}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No-provider fallback UI */}
      {showNoProviderFallback && !reqSubmitted && (
        <div className="space-y-4">
          <div className="rounded-lg p-4 text-sm border bg-accent/30 border-accent text-foreground">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-accent-foreground shrink-0" />
              <div>
                <p className="font-heading font-medium">No providers found in your area</p>
                {result.noProvidersMessage && (
                  <p className="mt-1 text-muted-foreground">{result.noProvidersMessage}</p>
                )}
                <p className="mt-2 text-muted-foreground">
                  Enter an invite code to proceed, or request access below.
                </p>
              </div>
            </div>
          </div>

          {/* Fallback invite code */}
          <div className="space-y-2">
            <Label htmlFor="fallbackCode" className="font-heading text-sm text-foreground">
              Invite Code
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fallbackCode"
                  type="text"
                  placeholder="Enter invite code"
                  value={fallbackCode}
                  onChange={(e) => setFallbackCode(e.target.value)}
                  className="pl-10 bg-card border-border font-body"
                  maxLength={50}
                />
              </div>
              <Button
                type="button"
                onClick={handleFallbackCodeCheck}
                disabled={fallbackLoading || !fallbackCode.trim()}
                className="font-heading bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {fallbackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
            {fallbackError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {fallbackError}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-heading uppercase">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Access request form */}
          {!showAccessForm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAccessForm(true)}
              className="w-full font-heading tracking-wide py-5"
            >
              <Send className="h-4 w-4 mr-2" />
              Request Access
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-border p-4 bg-card">
              <p className="text-sm font-heading text-foreground">Request Access</p>
              <p className="text-xs text-muted-foreground">
                Submit your info and an admin will review your request. You'll receive an invite code by email when approved.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reqName" className="text-sm font-heading text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="reqName"
                  type="text"
                  placeholder="Your name"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  className="bg-card border-border font-body"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reqEmail" className="text-sm font-heading text-foreground">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reqEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  className="bg-card border-border font-body"
                  maxLength={255}
                  required
                />
              </div>
              <Button
                type="button"
                onClick={handleAccessRequest}
                disabled={reqSubmitting || !reqEmail.trim()}
                className="w-full font-heading tracking-wide bg-secondary text-secondary-foreground hover:bg-secondary/80 py-5"
              >
                {reqSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Access request submitted confirmation */}
      {reqSubmitted && (
        <div className="rounded-lg p-4 text-sm border bg-primary/5 border-primary/20 text-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <p className="font-heading font-medium">Request Submitted!</p>
              <p className="mt-1 text-muted-foreground">
                Your access request has been sent to our admins. You'll receive an invite code by email once approved.
                Return to this page and enter the code to complete registration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main action buttons */}
      {!showNoProviderFallback && !reqSubmitted && (
        <>
          {!canProceed ? (
            <Button
              type="button"
              onClick={onCheck}
              disabled={loading || zipCode.length < 5}
              className="w-full font-heading tracking-wide bg-secondary text-secondary-foreground hover:bg-secondary/80 py-5"
            >
              {loading ? "Checking..." : "Verify Location"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleContinue}
              disabled={result.providers.length > 0 && !selectedProvider}
              className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5"
            >
              Continue
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default ZipCheckStep;
