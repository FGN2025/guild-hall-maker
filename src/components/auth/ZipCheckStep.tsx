import { MapPin, KeyRound, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
}

interface ZipCheckStepProps {
  zipCode: string;
  setZipCode: (v: string) => void;
  bypassCode: string;
  setBypassCode: (v: string) => void;
  result: ZipCheckResult | null;
  loading: boolean;
  onCheck: () => void;
  onProceed: () => void;
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

      {/* Result display */}
      {result && (
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

          {result.providers.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider">
                Providers in your area
              </p>
              {result.providers.map((p) => (
                <div
                  key={p.tenant_id}
                  className="flex items-center gap-3 p-2 rounded-md bg-card border border-border"
                >
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.tenant_name}
                      className="h-8 w-8 rounded object-contain"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground p-1" />
                  )}
                  <span className="font-heading text-sm">{p.tenant_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          onClick={onProceed}
          className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5"
        >
          Continue to Create Account
        </Button>
      )}
    </div>
  );
};

export default ZipCheckStep;
