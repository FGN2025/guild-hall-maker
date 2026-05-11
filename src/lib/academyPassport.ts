import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FALLBACK_BASE = "https://fgn.academy";
const DEFAULT_TEMPLATE = "/passport?email={email}";

type LinkMode = "direct" | "magic_link";

interface PassportConfig {
  base: string;
  template: string;
  mode: LinkMode;
}

const stripApiPath = (url?: string | null) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
};

const substituteTemplate = (
  template: string,
  values: Record<string, string | null | undefined>,
): string => {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = values[key];
    return v ? encodeURIComponent(v) : "";
  });
};

const useAcademyPassportConfig = () =>
  useQuery({
    queryKey: ["academy-passport-config"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PassportConfig> => {
      const { data } = await supabase
        .from("tenant_integrations")
        .select("api_url, additional_config")
        .eq("provider_type", "fgn_academy")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const cfg = (data?.additional_config ?? {}) as Record<string, unknown>;
      const base =
        (typeof cfg.passport_base_url === "string" && cfg.passport_base_url) ||
        stripApiPath(data?.api_url) ||
        FALLBACK_BASE;
      const template =
        (typeof cfg.passport_path_template === "string" && cfg.passport_path_template) ||
        DEFAULT_TEMPLATE;
      const mode: LinkMode =
        cfg.passport_link_mode === "magic_link" ? "magic_link" : "direct";

      return { base, template, mode };
    },
  });

/**
 * Backwards-compatible URL builder for direct-mode link-out.
 * In magic_link mode this still returns a best-effort direct URL,
 * but consumers should prefer useAcademyPassport().openPassport.
 */
export const useAcademyPassportUrl = (email: string | null | undefined) => {
  const { data: cfg } = useAcademyPassportConfig();
  const base = cfg?.base ?? FALLBACK_BASE;
  const template = cfg?.template ?? DEFAULT_TEMPLATE;
  const path = email
    ? substituteTemplate(template, { email })
    : "/passport";
  return `${base}${path}`;
};

/**
 * Preferred hook for opening the Academy Skill Passport.
 * Handles direct (template-substituted) and magic_link (edge function) modes.
 */
export const useAcademyPassport = (params: {
  email?: string | null;
  externalUserId?: string | null;
  slug?: string | null;
}) => {
  const { data: cfg, isLoading: cfgLoading } = useAcademyPassportConfig();
  const { toast } = useToast();

  const openPassport = useCallback(async () => {
    const base = cfg?.base ?? FALLBACK_BASE;
    const template = cfg?.template ?? DEFAULT_TEMPLATE;
    const mode = cfg?.mode ?? "direct";

    if (mode === "magic_link") {
      try {
        const { data, error } = await supabase.functions.invoke(
          "academy-passport-link",
          {
            body: {
              email: params.email ?? null,
              external_user_id: params.externalUserId ?? null,
            },
          },
        );
        if (error || !data?.url) {
          throw new Error(error?.message || "No magic link returned");
        }
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      } catch (err) {
        toast({
          title: "Couldn't open Skill Passport",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return;
      }
    }

    // direct mode
    const path = substituteTemplate(template, {
      email: params.email ?? "",
      external_user_id: params.externalUserId ?? "",
      slug: params.slug ?? "",
    });
    window.open(`${base}${path}`, "_blank", "noopener,noreferrer");
  }, [cfg, params.email, params.externalUserId, params.slug, toast]);

  return { openPassport, isLoading: cfgLoading, mode: cfg?.mode ?? "direct" };
};
