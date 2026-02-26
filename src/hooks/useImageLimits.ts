import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IMAGE_PRESETS, type ImageValidationRules } from "@/lib/imageValidation";

type PresetName = keyof typeof IMAGE_PRESETS;

interface OverrideEntry {
  maxSizeKB?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export function useImageLimits() {
  const { data: overrides } = useQuery({
    queryKey: ["image_upload_limits"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "image_upload_limits")
        .maybeSingle();
      if (!data?.value) return {} as Record<string, OverrideEntry>;
      try {
        return JSON.parse(data.value) as Record<string, OverrideEntry>;
      } catch {
        return {} as Record<string, OverrideEntry>;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const getPreset = (name: PresetName): ImageValidationRules => {
    const base = IMAGE_PRESETS[name];
    const ov = overrides?.[name];
    if (!ov) return base;
    return {
      ...base,
      maxSizeKB: ov.maxSizeKB ?? base.maxSizeKB,
      minWidth: ov.minWidth ?? base.minWidth,
      minHeight: ov.minHeight ?? base.minHeight,
      maxWidth: ov.maxWidth ?? base.maxWidth,
      maxHeight: ov.maxHeight ?? base.maxHeight,
    };
  };

  return { getPreset, overrides: overrides ?? {} };
}
