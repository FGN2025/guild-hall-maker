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

/** Designed branded fallback used when the event has no usable cover art.
 *  Diagonal brand gradient plus a subtle grid so a missing image still
 *  produces a publishable graphic instead of flat empty navy. */
export type PromoPlate = {
  fromHex: string;
  toHex: string;
  /** Grid line color (already includes alpha via rgba string). */
  gridColor: string;
  /** Grid cell size as a fraction of canvas width. */
  gridSpacingPct: number;
  /** Large soft brand-colored glow disc, top-right. */
  glowColor: string;
  glowRadiusPct: number;
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
  /** tournaments.prize_type — 'value' (points), 'physical', or 'none'. */
  prize_type?: string | null;
};

export type ComposePromoArgs = {
  event: PromoEventInput;
  tenantPrimaryColor?: string | null;
  tenantAccentColor?: string | null;
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
 *  prize_type is 'value'. Never print an ambiguous unitless number. */
export function formatPrizeLabel(
  pool: string | null | undefined,
  prizeType?: string | null,
): string | null {
  const raw = (pool ?? "").trim();
  if (!raw) return null;
  const type = (prizeType ?? "value").toLowerCase();
  if (type === "none") return null;
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
  const min = Math.round(baseFontSize * 0.55);
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

  const scale = W / 1080;
  const marginPct = 0.06;
  const safeWidth = W * (1 - marginPct * 2);

  const beatFs = Math.round(28 * scale);
  const gameFs = Math.round(30 * scale);
  const dateFs = Math.round(26 * scale);
  const prizeFs = Math.round(26 * scale);

  const { lines: titleLines, fontSize: titleFs } = fitTitle(
    args.event.name.toUpperCase(),
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
    plate: {
      fromHex: mixHex(accent, "#0b1120", 0.62),
      toHex: mixHex(accent2, "#0b1120", 0.86),
      gridColor: "rgba(255,255,255,0.06)",
      gridSpacingPct: 0.055,
      glowColor: accent,
      glowRadiusPct: 0.55,
    },
    gradient: {
      startPct: Math.max(0.28, (barTopY / H) - 0.12),
      fromRgba: "rgba(0,0,0,0)",
      toRgba: "rgba(0,0,0,0.85)",
    },
    accentBar: {
      xPct: 0.04,
      yPct: barTopY / H,
      wPct: 0.008,
      hPct: (barBottomY - barTopY) / H,
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
