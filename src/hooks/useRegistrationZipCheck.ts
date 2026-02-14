import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useRegistrationZipCheck() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ZipCheckResult | null>(null);

  const checkZip = async (zipCode: string, bypassCode?: string): Promise<ZipCheckResult> => {
    setLoading(true);
    try {
      // If bypass code provided, validate it
      if (bypassCode?.trim()) {
        const { data, error } = await supabase.rpc("validate_bypass_code", {
          _code: bypassCode.trim(),
        });
        if (error) throw error;
        if (data) {
          const res: ZipCheckResult = {
            valid: true,
            providers: [],
            bypassed: true,
            message: "Bypass code accepted.",
          };
          setResult(res);
          return res;
        }
        const res: ZipCheckResult = {
          valid: false,
          providers: [],
          bypassed: false,
          message: "Invalid or expired bypass code.",
        };
        setResult(res);
        return res;
      }

      // Validate ZIP via Smarty edge function
      const { data, error: fnError } = await supabase.functions.invoke('validate-zip', {
        body: { zipCode: zipCode.trim() },
      });

      if (fnError) throw fnError;

      if (!data.valid) {
        const res: ZipCheckResult = {
          valid: false,
          providers: [],
          bypassed: false,
          message: data.message || "Invalid ZIP code. Please enter a valid US ZIP code.",
        };
        setResult(res);
        return res;
      }

      const providerList = (data.providers as Provider[]) || [];

      const res: ZipCheckResult = {
        valid: true,
        providers: providerList,
        bypassed: false,
        message: data.message || (
          providerList.length > 0
            ? `Found ${providerList.length} provider(s) in your area!`
            : "Your ZIP is valid, but no broadband providers currently serve your area."
        ),
      };
      setResult(res);
      return res;
    } catch (err: any) {
      const res: ZipCheckResult = {
        valid: false,
        providers: [],
        bypassed: false,
        message: err.message || "An error occurred during validation.",
      };
      setResult(res);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setResult(null);

  return { checkZip, loading, result, reset };
}
