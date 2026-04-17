import { createContext, useContext, useEffect, useMemo, ReactNode } from "react";
import { useUserTenantBranding, type TenantBranding } from "@/hooks/useUserTenantBranding";

interface Ctx {
  branding: TenantBranding | null;
  isLoading: boolean;
}

const TenantBrandingContext = createContext<Ctx>({ branding: null, isLoading: false });

export const useTenantBranding = () => useContext(TenantBrandingContext);

/** Hex (#rrggbb) → "h s% l%" string for CSS HSL vars. Returns null on failure. */
function hexToHslTokens(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length !== 3) return null;
  const [r, g, b] = m.map((c) => parseInt(c, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const TenantBrandingProvider = ({ children }: { children: ReactNode }) => {
  const { data: branding, isLoading } = useUserTenantBranding();

  useEffect(() => {
    const root = document.documentElement;
    const primary = hexToHslTokens(branding?.primaryColor);
    const accent = hexToHslTokens(branding?.accentColor);

    if (primary) root.style.setProperty("--tenant-primary", primary);
    else root.style.removeProperty("--tenant-primary");

    if (accent) root.style.setProperty("--tenant-accent", accent);
    else root.style.removeProperty("--tenant-accent");

    return () => {
      root.style.removeProperty("--tenant-primary");
      root.style.removeProperty("--tenant-accent");
    };
  }, [branding?.primaryColor, branding?.accentColor]);

  const value = useMemo(
    () => ({ branding: branding ?? null, isLoading }),
    [branding, isLoading]
  );

  return (
    <TenantBrandingContext.Provider value={value}>
      {children}
    </TenantBrandingContext.Provider>
  );
};
