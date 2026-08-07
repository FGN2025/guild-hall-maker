// Server-side rasterizer for a PromoScene. Pure-WASM (resvg) so it runs in
// Supabase Edge Runtime with no native deps. Font parity is RELAXED to layout
// parity (Flag A): resvg-wasm ships NO fonts at all, so we load DejaVu Sans
// (regular + bold) at runtime and render every text node with it. Glyph shapes
// therefore differ from the browser canvas (system sans-serif), but positions,
// sizes, colors, gradient and accent bar match exactly.
//
// Kept in _shared/ so both the compose-event-promo MCP tool and any future
// server surface (e.g. a preview endpoint) share one code path.

// resvg is loaded lazily via a dynamic npm: specifier so that this module is
// import-safe for the build-time MCP manifest extractor (Node cannot resolve
// `npm:` specifiers; Deno resolves them at runtime on first render).
import type { PromoScene } from "./composePromoLayout.ts";

const FONT_URLS = [
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf",
];
export const SERVER_FONT_FAMILY = "DejaVu Sans";

let ResvgCtor: any = null;
let fontBuffers: Uint8Array[] = [];
let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      // @ts-expect-error Deno npm specifier resolved at runtime
      const mod = await import("npm:@resvg/resvg-wasm@2.6.2");
      ResvgCtor = mod.Resvg;
      const res = await fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm");
      if (!res.ok) throw new Error(`Failed to fetch resvg wasm: ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      await mod.initWasm(bytes);

      // resvg-wasm bundles no fonts — without these buffers every <text> node
      // silently renders as nothing.
      fontBuffers = await Promise.all(
        FONT_URLS.map(async (u) => {
          const r = await fetch(u);
          if (!r.ok) throw new Error(`Failed to fetch font ${u}: ${r.status}`);
          return new Uint8Array(await r.arrayBuffer());
        }),
      );
    })();
  }
  return wasmReady;
}



function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => (
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "&" ? "&amp;" :
    c === "'" ? "&apos;" : "&quot;"
  ));
}

/** Classified render failure. Callers surface `code` instead of letting the
 *  worker die with a raw WORKER_RESOURCE_LIMIT that shows up as an opaque
 *  badge error. */
export class PromoRenderError extends Error {
  code: string;
  detail: Record<string, unknown>;
  constructor(code: string, message: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.name = "PromoRenderError";
    this.code = code;
    this.detail = detail;
  }
}

// Background budget. Two independent ceilings:
//  - PIXEL: art wider/taller than this multiple of the output is pointless
//    detail and expensive to rasterize, so it gets downscaled.
//  - BYTE: a hard stop. Encoded art above this cannot be inlined safely even
//    after downscaling, and is reported as a classified error.
const BACKGROUND_PIXEL_BUDGET = 1.25; // x the longest output edge
const BACKGROUND_BYTE_CEILING = 4_000_000;
const MAX_DOWNSCALE_PASSES = 3;

/** Chunked base64. `bin += String.fromCharCode(b)` over a 1.5 MB buffer builds
 *  a 1.5 M-link rope before it is ever flattened; this keeps peak strings small. */
function toBase64(buf: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < buf.length; i += CHUNK) {
    parts.push(String.fromCharCode(...buf.subarray(i, i + CHUNK)));
  }
  return btoa(parts.join(""));
}

/** Intrinsic dimensions from the file header — no decode, no allocation. */
function sniffDimensions(b: Uint8Array): { width: number; height: number } | null {
  // PNG: IHDR width/height at bytes 16..24
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const dv = new DataView(b.buffer, b.byteOffset);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  // GIF
  if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    const dv = new DataView(b.buffer, b.byteOffset);
    return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
  }
  // JPEG: walk the segment chain to the first SOF marker
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const dv = new DataView(b.buffer, b.byteOffset);
        return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (len <= 0) break;
      i += 2 + len;
    }
  }
  return null;
}

export interface PreparedBackground {
  dataUrl: string;
  bytes: number;
  width: number | null;
  height: number | null;
  downscaled: boolean;
  log: string;
}

/** Re-raster art through resvg at a bounded width. resvg is already loaded for
 *  the promo render itself, so this adds no dependency. */
function downscalePng(dataUrl: string, srcW: number, srcH: number, targetW: number): Uint8Array {
  const targetH = Math.max(1, Math.round((srcH * targetW) / srcW));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${targetW}" height="${targetH}" viewBox="0 0 ${targetW} ${targetH}">` +
    `<image href="${dataUrl}" x="0" y="0" width="${targetW}" height="${targetH}" preserveAspectRatio="none"/></svg>`;
  return new ResvgCtor(svg, { fitTo: { mode: "width", value: targetW } }).render().asPng();
}

/**
 * Fetch the background ONCE and hand back an inline-ready data URL.
 *
 * This exists so a caller that needs both the flattened render and the
 * text-free editor plate does not fetch, base64-encode and inline the same art
 * twice. Doing it twice is what pushed a 1.5 MB cover past the edge worker's
 * memory ceiling: each pass materialised a ~3 MB binary string, a ~2 MB base64
 * string and a ~2 MB SVG document, and every one of those was then copied into
 * resvg's wasm linear memory, which only ever grows.
 */
export async function preparePromoBackground(
  url: string | null | undefined,
  scene: Pick<PromoScene, "width" | "height">,
): Promise<PreparedBackground | null> {
  if (!url) return null;
  await ensureWasm();

  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (e) {
    throw new PromoRenderError("background_fetch_failed", `Background fetch threw: ${(e as Error).message}`, { url });
  }
  if (!res.ok) {
    // A missing/expired art URL is not fatal — the caller falls back to the
    // generated plate, which is a designed surface in its own right.
    await res.body?.cancel();
    return null;
  }

  let contentType = res.headers.get("content-type") ?? "image/jpeg";
  let bytes = new Uint8Array(await res.arrayBuffer());
  const originalBytes = bytes.length;
  const dims = sniffDimensions(bytes);
  const notes: string[] = [
    `src=${originalBytes}B${dims ? ` ${dims.width}x${dims.height}` : " dims=unknown"}`,
  ];

  const longEdge = Math.max(scene.width, scene.height);
  const maxEdge = Math.round(longEdge * BACKGROUND_PIXEL_BUDGET);
  let downscaled = false;
  let w = dims?.width ?? null;
  let h = dims?.height ?? null;

  const overPixels = !!dims && Math.max(dims.width, dims.height) > maxEdge;
  const overBytes = originalBytes > BACKGROUND_BYTE_CEILING;

  if ((overPixels || overBytes) && dims) {
    let curBytes = bytes;
    let curW = dims.width;
    let curH = dims.height;
    for (let pass = 0; pass < MAX_DOWNSCALE_PASSES; pass++) {
      const byEdge = Math.max(curW, curH) > maxEdge
        ? Math.max(1, Math.round((curW * maxEdge) / Math.max(curW, curH)))
        : curW;
      // Byte pressure gets halved per pass on top of the pixel budget.
      const target = curBytes.length > BACKGROUND_BYTE_CEILING
        ? Math.max(320, Math.round(Math.min(byEdge, curW) / 2))
        : byEdge;
      if (target >= curW) break;
      const srcUrl = `data:${contentType};base64,${toBase64(curBytes)}`;
      try {
        curBytes = downscalePng(srcUrl, curW, curH, target) as Uint8Array<ArrayBuffer>;
      } catch (e) {
        throw new PromoRenderError(
          "background_downscale_failed",
          `Could not downscale background (${curW}x${curH}, ${curBytes.length}B): ${(e as Error).message}`,
          { url, width: curW, height: curH, bytes: curBytes.length },
        );
      }
      curH = Math.max(1, Math.round((curH * target) / curW));
      curW = target;
      contentType = "image/png";
      downscaled = true;
      if (curBytes.length <= BACKGROUND_BYTE_CEILING && Math.max(curW, curH) <= maxEdge) break;
    }
    bytes = curBytes;
    w = curW;
    h = curH;
    notes.push(`downscaled->${curW}x${curH} ${bytes.length}B`);
  }

  if (bytes.length > BACKGROUND_BYTE_CEILING) {
    throw new PromoRenderError(
      "background_too_large",
      `Background art is ${bytes.length} bytes after ${MAX_DOWNSCALE_PASSES} downscale passes, ceiling is ${BACKGROUND_BYTE_CEILING}.`,
      { url, bytes: bytes.length, ceiling: BACKGROUND_BYTE_CEILING },
    );
  }

  const dataUrl = `data:${contentType};base64,${toBase64(bytes)}`;
  notes.push(`inline=${dataUrl.length}B`);
  return { dataUrl, bytes: bytes.length, width: w, height: h, downscaled, log: notes.join(" ") };
}

function rgbaFromCss(rgba: string): string {
  // resvg understands rgba() natively; passthrough
  return rgba;
}

/**
 * Render a scene.
 *
 * `includeText: false` produces the text-free "background plate" (image +
 * gradient + accent bar) that the editor uses as its base so overlay_config
 * text layers are not drawn on top of already-baked glyphs.
 *
 * `background` lets a caller that needs BOTH outputs prepare the art once with
 * `preparePromoBackground` and reuse it. Omit it and the art is prepared
 * per-call; pass `null` to render with no art at all.
 */
export async function renderPromoSceneToPng(
  scene: PromoScene,
  opts: { includeText?: boolean; background?: PreparedBackground | null } = {},
): Promise<Uint8Array> {
  const includeText = opts.includeText !== false;
  await ensureWasm();

  const prepared = opts.background !== undefined
    ? opts.background
    : await preparePromoBackground(scene.backgroundUrl, scene);
  const bgHref: string | null = prepared?.dataUrl ?? null;


  const w = scene.width;
  const h = scene.height;
  const p = scene.plate;
  const gridStep = p.gridSpacingPct * w;

  // "Diagonal Field" plate geometry (mirrors renderPromoBrowser.drawPlate)
  const fpts = p.fieldPoints.map(([x, y]) => [x * w, y * h] as [number, number]);
  const fieldPoly = fpts.map(([x, y]) => `${x},${y}`).join(" ");
  const [lx, ly] = fpts[3];
  const [rx, ry] = fpts[2];
  const stripes = p.stripes.map((s) => {
    const dy = s.offsetPct * h;
    const th = s.thicknessPct * h;
    const poly = `${lx},${ly - dy} ${rx},${ry - dy} ${rx},${ry - dy - th} ${lx},${ly - dy - th}`;
    return `<polygon points="${poly}" fill="${s.color}" fill-opacity="${s.opacity}"/>`;
  }).join("");

  const arcs = (p.arcs ?? []).map((a) =>
    `<circle cx="${a.cxPct * w}" cy="${a.cyPct * h}" r="${a.rPct * w}" fill="none" stroke="${a.color}" stroke-width="${Math.max(1, a.widthPct * w)}" stroke-opacity="${a.opacity}"/>`
  ).join("");

  const shards = (p.shards ?? []).map((s) =>
    `<polygon points="${s.points.map(([x, y]) => `${x * w},${y * h}`).join(" ")}" fill="${s.color}" fill-opacity="${s.opacity}"/>`
  ).join("");

  let halftone = "";
  if (p.halftone) {
    const ht = p.halftone;
    const step = ht.spacingPct * w;
    const maxR = ht.radiusPct * w;
    const y0 = ht.fromYPct * h;
    const y1 = ht.toYPct * h;
    const parts: string[] = [];
    let row = 0;
    for (let y = y0; y < y1; y += step, row++) {
      const t = 1 - (y - y0) / Math.max(1, y1 - y0);
      const rr = maxR * (0.35 + 0.65 * t);
      const op = ht.maxOpacity * t * t;
      if (op < 0.01) continue;
      for (let x = (row % 2 ? step / 2 : 0); x < w; x += step) {
        parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${ht.color}" fill-opacity="${op.toFixed(3)}"/>`);
      }
    }
    halftone = parts.join("");
  }

  const bgLayer = bgHref
    ? `<image href="${bgHref}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" fill="${p.baseHex}"/>
       <g clip-path="url(#field)">
         <rect x="0" y="0" width="${w}" height="${h}" fill="url(#plate)"/>
         <rect x="0" y="0" width="${w}" height="${h}" fill="url(#grid)"/>
         <circle cx="${w * 0.78}" cy="${h * 0.14}" r="${p.glowRadiusPct * w}" fill="url(#glow)"/>
         ${arcs}
         ${shards}
         ${halftone}
         ${stripes}
       </g>
       <line x1="${lx}" y1="${ly}" x2="${rx}" y2="${ry}" stroke="${p.edge.color}" stroke-width="${Math.max(2, p.edge.widthPct * w)}"/>`;

  const scrim = (bgHref ? scene.imageScrim : scene.plateScrim) ?? {
    startPct: scene.gradient.startPct,
    stops: [
      { offset: 0, color: scene.gradient.fromRgba },
      { offset: 1, color: scene.gradient.toRgba },
    ],
  };
  const scrimStops = scrim.stops
    .map((s) => `<stop offset="${s.offset}" stop-color="${rgbaFromCss(s.color)}"/>`)
    .join("");

  const gradient = `
    <defs>
      <clipPath id="field"><polygon points="${fieldPoly}"/></clipPath>
      <linearGradient id="plate" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${p.fromHex}"/>
        <stop offset="1" stop-color="${p.toHex}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${p.glowColor}" stop-opacity="0.4"/>
        <stop offset="1" stop-color="${p.glowColor}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="${gridStep}" height="${gridStep}" patternUnits="userSpaceOnUse">
        <path d="M ${gridStep} 0 L 0 0 0 ${gridStep}" fill="none" stroke="${p.gridColor}" stroke-width="${Math.max(1, w / 1080)}"/>
      </pattern>
      <linearGradient id="dark" x1="0" y1="${scrim.startPct * h}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse">
        ${scrimStops}
      </linearGradient>

      <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="2" dy="2" result="off"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.6"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;


  const overlay = `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#dark)"/>`;

  // Local copy panel — photo/cover backgrounds only.
  const cp = scene.copyPanel;
  let copyPanel = "";
  let copyPanelDefs = "";
  if (bgHref && cp) {
    const x = cp.xPct * w;
    const y = cp.yPct * h;
    const pw = cp.wPct * w;
    const ph = cp.hPct * h;
    const r = cp.radiusPct * w;
    const feather = Math.max(1, cp.featherPct * ph);
    const mid = cp.fromRgba.replace(/0?\.\d+\)$/, "0.5)");
    copyPanelDefs = `
      <linearGradient id="cpx" x1="${x}" y1="0" x2="${x + pw}" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${cp.fromRgba}"/>
        <stop offset="0.62" stop-color="${mid}"/>
        <stop offset="1" stop-color="${cp.toRgba}"/>
      </linearGradient>
      <linearGradient id="cpy" x1="0" y1="${y}" x2="0" y2="${y + feather}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="1"/>
      </linearGradient>
      <mask id="cpmask">
        <rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="#fff"/>
        <rect x="${x}" y="${y}" width="${pw}" height="${feather}" fill="url(#cpy)"/>
      </mask>`;
    copyPanel = `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="${r}" ry="${r}" fill="url(#cpx)" mask="url(#cpmask)"/>`;
  }

  const ab = scene.accentBar;
  const accent = `<rect x="${ab.xPct * w}" y="${ab.yPct * h}" width="${ab.wPct * w}" height="${ab.hPct * h}" fill="${ab.color}"/>`;


  const textNodes = (includeText ? scene.texts : []).map((t) => {
    const weight = t.fontWeight === "bold" ? "bold" : "normal";
    // SVG y is baseline; approximate top-baseline by adding fontSize*0.85
    const y = t.yPct * h + t.fontSize * 0.85;
    return `<text x="${t.xPct * w}" y="${y}" font-family="${SERVER_FONT_FAMILY}" font-size="${t.fontSize}" font-weight="${weight}" fill="${t.color}" filter="url(#drop)">${escapeXml(t.text)}</text>`;
  }).join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${gradient}
  ${bgLayer}
  ${overlay}
  <defs>${copyPanelDefs}</defs>
  ${copyPanel}
  ${accent}
  ${textNodes}
</svg>`;

  const resvg = new ResvgCtor(svg, {
    background: scene.backgroundFallbackHex,
    fitTo: { mode: "width", value: w },
    font: {
      loadSystemFonts: false, // deterministic — only the buffers below
      fontBuffers,
      defaultFontFamily: SERVER_FONT_FAMILY,
    },
  });

  const png = resvg.render().asPng();
  return png;
}
