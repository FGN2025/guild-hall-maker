// Shared, deterministic promo layout. Consumed by both:
//   - browser canvas render in TenantPromoPickerDialog (client "quick create")
//   - server SVG render in supabase/functions/_shared/promo/renderPromo.ts
//     (MCP compose_event_promo tool)
// No DOM, no canvas, no Deno imports — pure data in / declarative scene out.

export type PromoFormat = "portrait" | "square" | "landscape" | "story";

export const PROMO_DIMENSIONS: Record<PromoFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1200, height: 628 },
  story: { width: 1080, height: 1920 },
};

export type PromoText = {
  text: string;
  xPct: number;
  yPct: number;
  fontSize: number;   // in pixels at target width; scale linearly for canvas variants
  color: string;
  fontWeight?: "normal" | "bold";
};

export type PromoScene = {
  format: PromoFormat;
  width: number;
  height: number;
  backgroundUrl: string | null;
  backgroundFallbackHex: string;
  /** Bottom-anchored dark gradient for text readability. startPct is where the
   *  gradient begins (0..1 from top). */
  gradient: { startPct: number; fromRgba: string; toRgba: string };
  /** Left accent bar for brand emphasis. Height is a % of canvas height. */
  accentBar: { xPct: number; yPct: number; wPct: number; hPct: number; color: string };
  texts: PromoText[];
};

export type PromoEventInput = {
  name: string;
  game?: string | null;
  start_date?: string | null;
  prize_pool?: string | null;
};

export type ComposePromoArgs = {
  event: PromoEventInput;
  tenantPrimaryColor?: string | null;
  format?: PromoFormat;
  beatLabel?: string | null;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function composePromoLayout(args: ComposePromoArgs): PromoScene {
  const format = args.format ?? "portrait";
  const dim = PROMO_DIMENSIONS[format];
  const accent = args.tenantPrimaryColor || "#22d3ee";
  const dateStr = formatDate(args.event.start_date);

  const texts: PromoText[] = [];

  if (args.beatLabel) {
    texts.push({
      text: args.beatLabel.toUpperCase(),
      xPct: 0.06, yPct: 0.56,
      fontSize: 28, color: accent, fontWeight: "bold",
    });
  }

  texts.push({
    text: args.event.name.toUpperCase(),
    xPct: 0.06, yPct: 0.62,
    fontSize: 64, color: "#ffffff", fontWeight: "bold",
  });

  if (args.event.game) {
    texts.push({
      text: args.event.game,
      xPct: 0.06, yPct: 0.76,
      fontSize: 30, color: "#e2e8f0",
    });
  }

  if (dateStr) {
    texts.push({
      text: dateStr,
      xPct: 0.06, yPct: 0.83,
      fontSize: 26, color: "#cbd5e1",
    });
  }

  if (args.event.prize_pool) {
    texts.push({
      text: `Prize: ${args.event.prize_pool}`,
      xPct: 0.06, yPct: 0.90,
      fontSize: 26, color: accent, fontWeight: "bold",
    });
  }

  return {
    format,
    width: dim.width,
    height: dim.height,
    backgroundUrl: null, // caller fills from event.image_url — kept separate so
                         // the layout is decoupled from image loading
    backgroundFallbackHex: "#0f172a",
    gradient: {
      startPct: 0.45,
      fromRgba: "rgba(0,0,0,0)",
      toRgba: "rgba(0,0,0,0.85)",
    },
    accentBar: {
      xPct: 0.04, yPct: 0.62,
      wPct: 0.008, hPct: 0.32,
      color: accent,
    },
    texts,
  };
}

/** Convert a scene's texts to the shape `useCanvasEditor.applyTemplate` and
 *  `AssetEditorDialog.initialTexts` already accept (so composer output opens
 *  in the editor as individually-editable layers with zero glue code). */
export function promoSceneToEditorTexts(scene: PromoScene) {
  return scene.texts.map((t) => ({
    text: t.text,
    xPct: t.xPct,
    yPct: t.yPct,
    x: Math.round(t.xPct * scene.width),
    y: Math.round(t.yPct * scene.height),
    fontSize: t.fontSize,
    color: t.color,
    fontFamily: "sans-serif",
    fontWeight: t.fontWeight ?? "normal",
  }));
}
