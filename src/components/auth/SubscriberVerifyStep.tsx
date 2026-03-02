import { useState } from "react";
import { User, Hash, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SubscriberVerifyStepProps {
  tenantId: string;
  zipCode: string;
  onVerified: () => void;
  onBack: () => void;
}

const SubscriberVerifyStep = ({ tenantId, zipCode, onVerified, onBack }: SubscriberVerifyStepProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("validate-subscriber", {
        body: {
          tenant_id: tenantId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          zip_code: zipCode,
          account_number: accountNumber.trim() || undefined,
        },
      });
      if (fnError) throw fnError;
      if (data?.valid) {
        onVerified();
      } else {
        setError(data?.message || "Could not verify your subscriber information. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4 text-sm border bg-primary/5 border-primary/20 text-foreground">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>Please verify your subscriber information to continue.</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subFirstName" className="font-heading text-sm text-foreground">
          First Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="subFirstName"
            placeholder="First name on your account"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="pl-10 bg-card border-border font-body"
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subLastName" className="font-heading text-sm text-foreground">
          Last Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="subLastName"
            placeholder="Last name on your account"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="pl-10 bg-card border-border font-body"
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subAcctNum" className="font-heading text-sm text-muted-foreground">
          Account Number <span className="text-xs">(optional)</span>
        </Label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="subAcctNum"
            placeholder="Your account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="pl-10 bg-card border-border font-body"
            maxLength={50}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 text-sm border bg-destructive/5 border-destructive/20 text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={handleVerify}
        disabled={loading || !firstName.trim() || !lastName.trim()}
        className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...
          </>
        ) : (
          "Verify & Continue"
        )}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to provider selection
      </button>
    </div>
  );
};

export default SubscriberVerifyStep;
