import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_BASE = "https://fgn.academy";

const stripApiPath = (url?: string | null) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
};

export const useAcademyPassportUrl = (email: string | null | undefined) => {
  const { data: base } = useQuery({
    queryKey: ["academy-passport-base"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_integrations")
        .select("api_url, additional_config")
        .eq("provider_type", "fgn_academy")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const cfg = (data?.additional_config ?? {}) as Record<string, unknown>;
      return (
        (typeof cfg.passport_base_url === "string" && cfg.passport_base_url) ||
        stripApiPath(data?.api_url) ||
        FALLBACK_BASE
      );
    },
  });

  const root = base ?? FALLBACK_BASE;
  return email
    ? `${root}/passport?email=${encodeURIComponent(email)}`
    : `${root}/passport`;
};
