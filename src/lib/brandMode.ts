/**
 * FGN Brand Mode bootstrapper.
 *
 * Two modes share the same master palette (see BRAND.md):
 *   - "arcade"     → dark, cyan primary CTA (default for play.fgn.gg)
 *   - "enterprise" → light, violet primary CTA (for embeds in provider portals
 *                    or any non-gaming audience)
 *
 * Enterprise mode activates when ANY of:
 *   - URL contains ?mode=enterprise
 *   - Page is rendered inside an <iframe> (window !== window.top)
 *   - localStorage.fgn-brand-mode === "enterprise"
 *
 * It applies BEFORE React mounts so there is no flash. It sets:
 *   <html class="light enterprise">
 * and persists the choice in localStorage.
 *
 * The .enterprise class is reserved for future per-mode overrides if needed;
 * the .light class is what next-themes picks up for token swapping.
 */

const STORAGE_KEY = "fgn-brand-mode";

export type BrandMode = "arcade" | "enterprise";

export function detectBrandMode(): BrandMode {
  if (typeof window === "undefined") return "arcade";
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("mode");
    if (fromUrl === "enterprise") return "enterprise";
    if (fromUrl === "arcade") return "arcade";

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "enterprise" || stored === "arcade") return stored;

    if (window.self !== window.top) return "enterprise";
  } catch {
    /* ignore */
  }
  return "arcade";
}

export function applyBrandMode(mode: BrandMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "enterprise") {
    root.classList.add("light", "enterprise");
    root.classList.remove("dark");
  } else {
    root.classList.remove("light", "enterprise");
    root.classList.add("dark");
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Run once at module load to set the class before React mounts. */
export function bootstrapBrandMode() {
  applyBrandMode(detectBrandMode());
}
