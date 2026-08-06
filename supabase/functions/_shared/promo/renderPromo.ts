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
import type { PromoScene } from "../../../../src/lib/promo/composePromoLayout.ts";

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

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const buf = new Uint8Array(await res.arrayBuffer());
    // base64 encode
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

function rgbaFromCss(rgba: string): string {
  // resvg understands rgba() natively; passthrough
  return rgba;
}

/** Render a scene. `includeText: false` produces the text-free "background
 *  plate" (image + gradient + accent bar) that the editor uses as its base so
 *  overlay_config text layers are not drawn on top of already-baked glyphs. */
export async function renderPromoSceneToPng(
  scene: PromoScene,
  opts: { includeText?: boolean } = {},
): Promise<Uint8Array> {
  const includeText = opts.includeText !== false;
  await ensureWasm();

  // Preload background as data URL for self-contained SVG
  let bgHref: string | null = null;
  if (scene.backgroundUrl) {
    bgHref = await fetchAsDataUrl(scene.backgroundUrl);
  }

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
