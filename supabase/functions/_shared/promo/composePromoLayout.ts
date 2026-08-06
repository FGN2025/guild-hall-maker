// Shared, deterministic promo layout. Consumed by both:
//   - browser canvas render in TenantPromoPickerDialog (client "quick create")
//   - server SVG render in supabase/functions/_shared/promo/renderPromo.ts
//     (MCP compose_event_promo tool)
// No DOM, no canvas, no Deno imports — pure data in / declarative scene out.

import { normalizeEventTitle, type TitleNormalization } from "./normalizeEventTitle.ts";

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

/** "Diagonal Field" — the designed branded fallback used when an event has no
 *  usable cover art (and no game cover art either).
 *
 *  Structure, top to bottom:
 *    1. Deep ink base fill (baseHex) — the copy always sits on this.
 *    2. A steep diagonal FIELD polygon across the upper canvas, filled with a
 *       brand gradient (fromHex -> toHex). Its lower edge is the "diagonal".
 *    3. Grid, glow disc and parallel stripes, all CLIPPED to the field so the
 *       lower copy area stays clean.
 *    4. A bright 1-2px accent line drawn along the diagonal edge.
 *
 *  Everything is expressed in percentages so both renderers agree exactly. */
export type PromoPlate = {
  fromHex: string;
  toHex: string;
  /** Grid line color (already includes alpha via rgba string). */
  gridColor: string;
  /** Grid cell size as a fraction of canvas width. */
  gridSpacingPct: number;
  /** Large soft brand-colored glow disc inside the field. */
  glowColor: string;
  glowRadiusPct: number;
  /** Deep ink base behind everything. */
  baseHex: string;
  /** Field polygon, clockwise, as [xPct, yPct] pairs. */
  fieldPoints: Array<[number, number]>;
  /** Bright line along the field's diagonal edge. */
  edge: { color: string; widthPct: number };
  /** Parallel accent stripes inside the field, offset along the diagonal. */
  stripes: Array<{ offsetPct: number; thicknessPct: number; color: string; opacity: number }>;
  /** Off-canvas concentric brand arcs. Center/radius are fractions of WIDTH
   *  (x) and HEIGHT is derived by the renderers using width units so the arcs
   *  stay circular in both surfaces. */
  arcs: Array<{ cxPct: number; cyPct: number; rPct: number; widthPct: number; color: string; opacity: number }>;
  /** Angular shards echoing the diagonal rake. Points are [xPct, yPct]. */
  shards: Array<{ points: Array<[number, number]>; color: string; opacity: number }>;
  /** Halftone dot field that fades out as it approaches the diagonal edge. */
  halftone: {
    spacingPct: number;      // fraction of width between dot centers
    radiusPct: number;       // max dot radius as fraction of width
    color: string;
    fromYPct: number;        // where the field starts (dense)
    toYPct: number;          // where it has fully faded
    maxOpacity: number;
  };
};

export type PromoGradientStops = { startPct: number; stops: Array<{ offset: number; color: string }> };

/** Local contrast plate drawn ONLY behind the copy block when a photo / cover
 *  art is the background. Lets the global scrim stay light so the art keeps its
 *  colour while the type still passes contrast. */
export type PromoCopyPanel = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  radiusPct: number;
  /** Horizontal fade: opaque at the left edge, transparent at the right. */
  fromRgba: string;
  toRgba: string;
  /** Vertical soft feather at the top of the panel (0..1 of panel height). */
  featherPct: number;
};

export type PromoScene = {
  format: PromoFormat;
  width: number;
  height: number;
  backgroundUrl: string | null;
  backgroundFallbackHex: string;
  /** Rendered when backgroundUrl is null OR the image fetch fails. */
  plate: PromoPlate;
  /** Bottom-anchored dark gradient for text readability. startPct is where the
   *  gradient begins (0..1 from top). Legacy two-stop form, kept for callers
   *  that read it directly; renderers prefer plateScrim / imageScrim. */
  gradient: { startPct: number; fromRgba: string; toRgba: string };
  /** Scrim used when the designed plate is the background (already dark). */
  plateScrim: PromoGradientStops;
  /** Light global scrim used when a photo / cover art is the background. */
  imageScrim: PromoGradientStops;
  /** Local panel behind the copy block, image backgrounds only. */
  copyPanel: PromoCopyPanel;
  /** Left accent bar for brand emphasis. Height is a % of canvas height. */
  accentBar: { xPct: number; yPct: number; wPct: number; hPct: number; color: string };
  texts: PromoText[];
  /** Audit record of the display-side title rewrite (source row untouched). */
  titleNormalization: TitleNormalization;
};

export type PromoEventInput = {
  name: string;
  game?: string | null;
  start_date?: string | null;
  prize_pool?: string | null;
  /** tournaments.prize_type — 'value' (points), 'physical', or 'none'. */
  prize_type?: string | null;
};

export type ComposePromoArgs = {
  event: PromoEventInput;
  tenantPrimaryColor?: string | null;
  tenantAccentColor?: string | null;
  /** Used display-side only, to strip a redundant leading tenant name. */
  tenantName?: string | null;
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

/** `tournaments.prize_pool` is free text. Bare numbers mean POINTS when
 *  prize_type is 'value'. Never print an ambiguous unitless number.
 *
 *  ZERO IS NOT NULL, but it renders the same way: a numerically-zero pool
 *  ("0", "0.00", "0 pts", "$0") returns null so the line is omitted rather
 *  than publishing "Prize Pool: 0 pts". Game nights with no pot therefore
 *  print no prize line at all. */
export function formatPrizeLabel(
  pool: string | null | undefined,
  prizeType?: string | null,
): string | null {
  const raw = (pool ?? "").trim();
  if (!raw) return null;
  const type = (prizeType ?? "value").toLowerCase();
  if (type === "none") return null;

  // Zero check runs before every branch: pull the first number out of the
  // string and suppress when it is exactly zero.
  const numeric = raw.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (numeric && Number(numeric[0]) === 0) return null;

  if (type === "physical") return raw;
  // value type
  if (/^\d[\d,]*(\.\d+)?$/.test(raw)) return `${raw} pts`;
  // already carries a unit or currency symbol — trust the author
  if (/[a-zA-Z$€£¥]/.test(raw)) return raw;
  // anything else is ambiguous — suppress rather than publish a bare number
  return null;
}

// ---------------------------------------------------------------------------
// Deterministic text metrics. Both renderers use a plain sans stack, so an
// advance-width table keyed by char class is close enough for wrap decisions
// and — critically — identical on client and server.
// ---------------------------------------------------------------------------

const WIDE_CHARS = new Set(["M", "W", "@", "%", "m", "w"]);
const NARROW_CHARS = new Set(["I", "i", "l", "j", "t", "f", "r", ".", ",", ";", ":", "'", "!", "|", "(", ")", "[", "]", " ", "-"]);

function charAdvance(c: string): number {
  if (WIDE_CHARS.has(c)) return 0.92;
  if (NARROW_CHARS.has(c)) return 0.32;
  if (c >= "A" && c <= "Z") return 0.68;
  if (c >= "0" && c <= "9") return 0.6;
  return 0.55;
}

export function estimateTextWidth(text: string, fontSize: number, bold = false): number {
  let units = 0;
  for (const c of text) units += charAdvance(c);
  return units * fontSize * (bold ? 1.04 : 1);
}

/** Greedy wrap. Returns null when the text cannot fit within maxLines. */
function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number, bold: boolean): string[] | null {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidth(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (estimateTextWidth(word, fontSize, bold) > maxWidth) return null; // single word too wide
      if (lines.length > maxLines) return null;
    }
  }
  if (current) lines.push(current);
  if (lines.length === 0 || lines.length > maxLines) return null;
  return lines;
}

/** Wrap onto at most `maxLines` lines, shrinking the font until it fits. */
export function fitTitle(
  text: string,
  baseFontSize: number,
  maxWidth: number,
  maxLines = 3,
): { lines: string[]; fontSize: number } {
  const min = Math.round(baseFontSize * 0.42);
  for (let fs = baseFontSize; fs >= min; fs -= 2) {
    const lines = wrapText(text, fs, maxWidth, maxLines, true);
    if (lines) return { lines, fontSize: fs };
  }
  // Hard fallback: character-chop at the minimum size, ellipsis the overflow.
  const fs = min;
  const lines: string[] = [];
  let rest = text;
  while (rest.length && lines.length < maxLines) {
    let take = rest.length;
    while (take > 1 && estimateTextWidth(rest.slice(0, take), fs, true) > maxWidth) take--;
    lines.push(rest.slice(0, take).trim());
    rest = rest.slice(take).trim();
  }
  if (rest.length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
  return { lines, fontSize: fs };
}

// ---------------------------------------------------------------------------

function clampHex(h: string | null | undefined, fallback: string): string {
  return h && /^#[0-9a-fA-F]{6}$/.test(h) ? h : fallback;
}

function mixHex(hex: string, target: string, amount: number): string {
  const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(hex);
  const [r2, g2, b2] = p(target);
  const m = (a: number, b: number) => Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

export function composePromoLayout(args: ComposePromoArgs): PromoScene {
  const format = args.format ?? "portrait";
  const dim = PROMO_DIMENSIONS[format];
  const W = dim.width;
  const H = dim.height;
  const accent = clampHex(args.tenantPrimaryColor, "#22d3ee");
  const accent2 = clampHex(args.tenantAccentColor, mixHex(accent, "#22d3ee", 0.5));
  const dateStr = formatDate(args.event.start_date);
  const prizeLabel = formatPrizeLabel(args.event.prize_pool, args.event.prize_type);

  // Type is sized so the copy block holds the same optical weight when each
  // format is viewed at the SAME DISPLAY SIZE (i.e. scaled to fit a feed slot,
  // which is height-bound for tall formats). Sizing against the short edge —
  // the previous rule — under-sized portrait, because 1080x1350 gets scaled
  // down harder than 1080x1080 at the same viewing height. Reference is the
  // landscape short edge (628) that reviewed well at 1.0. Width is still a
  // ceiling so a very tall canvas can't produce type wider than the safe area.
  const scale = Math.min(H, W * 1.35) / 628;
  const marginPct = 0.06;
  const safeWidth = W * (1 - marginPct * 2);

  const beatFs = Math.round(28 * scale);
  const gameFs = Math.round(30 * scale);
  const dateFs = Math.round(26 * scale);
  const prizeFs = Math.round(26 * scale);

  // Display-side title normalization. Never mutates the source row; the audit
  // record rides along on the scene so callers can log before/after.
  const titleNorm = normalizeEventTitle({
    name: args.event.name,
    game: args.event.game ?? null,
    dateShown: !!dateStr,
    tenantName: args.tenantName ?? null,
  });

  const { lines: titleLines, fontSize: titleFs } = fitTitle(
    titleNorm.after.toUpperCase(),
    Math.round(64 * scale),
    safeWidth,
    3,
  );

  // Tail block keeps its historical anchors; the title block grows upward from
  // just above it so extra lines never push copy off the canvas.
  const prizeY = 0.90 * H;
  const dateY = 0.83 * H;
  const gameY = 0.76 * H;
  const tailTop = args.event.game ? gameY : dateStr ? dateY : prizeLabel ? prizeY : 0.94 * H;

  const lineH = titleFs * 1.12;
  const titleTop = tailTop - 0.022 * H - titleLines.length * lineH;
  const beatY = titleTop - beatFs * 1.7;

  const texts: PromoText[] = [];

  if (args.beatLabel) {
    texts.push({
      text: args.beatLabel.toUpperCase(),
      xPct: marginPct, yPct: beatY / H,
      fontSize: beatFs, color: accent, fontWeight: "bold",
    });
  }

  titleLines.forEach((line, i) => {
    texts.push({
      text: line,
      xPct: marginPct, yPct: (titleTop + i * lineH) / H,
      fontSize: titleFs, color: "#ffffff", fontWeight: "bold",
    });
  });

  if (args.event.game) {
    texts.push({ text: args.event.game, xPct: marginPct, yPct: gameY / H, fontSize: gameFs, color: "#e2e8f0" });
  }
  if (dateStr) {
    texts.push({ text: dateStr, xPct: marginPct, yPct: dateY / H, fontSize: dateFs, color: "#cbd5e1" });
  }
  if (prizeLabel) {
    texts.push({
      text: `Prize: ${prizeLabel}`,
      xPct: marginPct, yPct: prizeY / H,
      fontSize: prizeFs, color: accent, fontWeight: "bold",
    });
  }

  const barTopY = args.beatLabel ? beatY : titleTop;
  const barBottomY = (prizeLabel ? prizeY + prizeFs : dateStr ? dateY + dateFs : tailTop) + 0.006 * H;

  return {
    format,
    width: W,
    height: H,
    backgroundUrl: null, // caller fills from event.image_url — kept separate so
                         // the layout is decoupled from image loading
    backgroundFallbackHex: "#0f172a",
    plate: (() => {
      // The field must clear the copy block: its lowest point sits just above
      // the first line of text (beat label, or the title when there is none).
      const copyTop = barTopY / H;
      const fieldLeft = Math.min(0.74, Math.max(0.34, copyTop - 0.04));
      const fieldRight = Math.max(0.16, fieldLeft - 0.16); // steep upward rake
      const light = mixHex(accent, "#ffffff", 0.35);
      return {
        fromHex: mixHex(accent, "#0b1120", 0.28),
        toHex: mixHex(accent2, "#0b1120", 0.6),
        gridColor: "rgba(255,255,255,0.08)",
        gridSpacingPct: 0.055,
        glowColor: light,
        glowRadiusPct: 0.55,
        baseHex: mixHex(accent, "#080d18", 0.88),
        fieldPoints: [
          [0, 0],
          [1, 0],
          [1, fieldRight],
          [0, fieldLeft],
        ] as Array<[number, number]>,
        edge: { color: light, widthPct: 0.0045 },
        stripes: [
          { offsetPct: 0.02, thicknessPct: 0.008, color: light, opacity: 0.7 },
          { offsetPct: 0.055, thicknessPct: 0.014, color: accent, opacity: 0.55 },
          { offsetPct: 0.105, thicknessPct: 0.006, color: accent2, opacity: 0.4 },
          { offsetPct: 0.32, thicknessPct: 0.34, color: accent2, opacity: 0.14 },
        ],
        // Off-canvas brand arcs anchored beyond the top-right corner. They give
        // the upper field a focal sweep instead of dead space.
        arcs: [
          { cxPct: 1.06, cyPct: -0.03, rPct: 0.42, widthPct: 0.010, color: light, opacity: 0.55 },
          { cxPct: 1.06, cyPct: -0.03, rPct: 0.66, widthPct: 0.005, color: accent, opacity: 0.45 },
          { cxPct: 1.06, cyPct: -0.03, rPct: 0.92, widthPct: 0.0035, color: accent2, opacity: 0.32 },
          { cxPct: -0.12, cyPct: fieldLeft * 0.55, rPct: 0.34, widthPct: 0.004, color: accent2, opacity: 0.3 },
        ],
        // Angular shards raked to the same diagonal, layered for depth.
        shards: [
          {
            points: [[0, 0], [0.46, 0], [0.20, fieldLeft - 0.06], [0, fieldLeft - 0.05]] as Array<[number, number]>,
            color: "#000000",
            opacity: 0.22,
          },
          {
            points: [[0.52, 0], [0.70, 0], [0.30, fieldLeft - 0.02], [0.14, fieldLeft - 0.02]] as Array<[number, number]>,
            color: accent,
            opacity: 0.35,
          },
          {
            points: [[0.74, 0], [0.82, 0], [0.56, fieldRight - 0.01], [0.49, fieldRight - 0.01]] as Array<[number, number]>,
            color: light,
            opacity: 0.4,
          },
          {
            points: [[0.86, 0.02], [1, 0.10], [1, fieldRight - 0.02], [0.70, fieldRight - 0.03]] as Array<[number, number]>,
            color: "#ffffff",
            opacity: 0.07,
          },
        ],
        halftone: {
          spacingPct: 0.042,
          radiusPct: 0.0075,
          color: "#ffffff",
          fromYPct: 0.02,
          toYPct: fieldLeft,
          maxOpacity: 0.3,
        },
      };
    })(),

    gradient: {
      startPct: Math.max(0.28, (barTopY / H) - 0.12),
      fromRgba: "rgba(0,0,0,0)",
      toRgba: "rgba(0,0,0,0.85)",
    },
    plateScrim: {
      startPct: Math.max(0.28, (barTopY / H) - 0.12),
      stops: [
        { offset: 0, color: "rgba(0,0,0,0)" },
        { offset: 1, color: "rgba(0,0,0,0.85)" },
      ],
    },
    // Photo / cover art: keep the global scrim LIGHT so the key art stays
    // vivid. Contrast for the copy is won locally by copyPanel below.
    imageScrim: {
      startPct: Math.max(0.30, (barTopY / H) - 0.10),
      stops: [
        { offset: 0, color: "rgba(6,10,20,0)" },
        { offset: 0.55, color: "rgba(6,10,20,0.34)" },
        { offset: 1, color: "rgba(6,10,20,0.78)" },
      ],
    },
    // Tight local plate behind the copy column only: opaque at the accent bar,
    // fading out before the right edge so the artwork reads through.
    copyPanel: (() => {
      const top = Math.max(0, barTopY / H - 0.028);
      const bottom = Math.min(1, barBottomY / H + 0.030);
      const widest = Math.max(
        ...texts.map((t) => estimateTextWidth(t.text, t.fontSize, t.fontWeight === "bold")),
        safeWidth * 0.5,
      );
      const wPct = Math.min(0.96, (widest / W) + marginPct + 0.10);
      return {
        xPct: 0.02,
        yPct: top,
        wPct,
        hPct: bottom - top,
        radiusPct: 0.02,
        fromRgba: "rgba(6,10,20,0.80)",
        toRgba: "rgba(6,10,20,0)",
        featherPct: 0.16,
      };
    })(),

    accentBar: {
      xPct: 0.04,
      yPct: barTopY / H,
      wPct: 0.008,
      hPct: (barBottomY - barTopY) / H,
      color: accent,
    },
    texts,
    titleNormalization: titleNorm,
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
