import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TenantCodeValidationResult {
  valid: boolean;
  reason?: string;
  code_id?: string;
  code_type?: string;
  tenant_id?: string;
  campaign_id?: string;
  description?: string;
}

/**
 * Hook to validate tenant codes during registration or campaign redemption.
 * 
 * @param dryRun - If true, checks validity without incrementing the usage counter.
 *                 Use dry_run=true for preview/checking, false for actual redemption.
 */
export function useValidateTenantCode(dryRun = false) {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<TenantCodeValidationResult | null>(null);

  const validate = async (code: string, tenantId?: string): Promise<TenantCodeValidationResult> => {
    setIsValidating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("validate-tenant-code", {
        body: { code, tenant_id: tenantId || null, dry_run: dryRun },
      });

      if (error) throw error;

      const res = data as TenantCodeValidationResult;
      setResult(res);
      return res;
    } catch (err: any) {
      const res: TenantCodeValidationResult = { valid: false, reason: err.message || "Validation failed" };
      setResult(res);
      return res;
    } finally {
      setIsValidating(false);
    }
  };

  const reset = () => setResult(null);

  return { validate, isValidating, result, reset };
}
