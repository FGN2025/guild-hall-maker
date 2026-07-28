// Server-side rasterizer for a PromoScene. Pure-WASM (resvg) so it runs in
// Supabase Edge Runtime with no native deps. Font parity was RELAXED to
// layout parity — resvg falls back on its bundled DejaVu for `sans-serif`;
// positions, sizes, colors, gradient, accent bar all match the browser
// renderer exactly.
//
// Kept in _shared/ so both the compose-event-promo MCP tool and any future
// server surface (e.g. a preview endpoint) share one code path.

// resvg is loaded lazily via a dynamic npm: specifier so that this module is
// import-safe for the build-time MCP manifest extractor (Node cannot resolve
// `npm:` specifiers; Deno resolves them at runtime on first render).
import type { PromoScene } from "../../../../src/lib/promo/composePromoLayout.ts";

let ResvgCtor: any = null;
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

export async function renderPromoSceneToPng(scene: PromoScene): Promise<Uint8Array> {
  await ensureWasm();

  // Preload background as data URL for self-contained SVG
  let bgHref: string | null = null;
  if (scene.backgroundUrl) {
    bgHref = await fetchAsDataUrl(scene.backgroundUrl);
  }

  const w = scene.width;
  const h = scene.height;
  const gradStartY = scene.gradient.startPct * h;

  const bgLayer = bgHref
    ? `<image href="${bgHref}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" fill="${scene.backgroundFallbackHex}"/>`;

  const gradient = `
    <defs>
      <linearGradient id="dark" x1="0" y1="${gradStartY}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${rgbaFromCss(scene.gradient.fromRgba)}"/>
        <stop offset="1" stop-color="${rgbaFromCss(scene.gradient.toRgba)}"/>
      </linearGradient>
      <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="2" dy="2" result="off"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.6"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

  const overlay = `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#dark)"/>`;

  const ab = scene.accentBar;
  const accent = `<rect x="${ab.xPct * w}" y="${ab.yPct * h}" width="${ab.wPct * w}" height="${ab.hPct * h}" fill="${ab.color}"/>`;

  const textNodes = scene.texts.map((t) => {
    const weight = t.fontWeight === "bold" ? "bold" : "normal";
    // SVG y is baseline; approximate top-baseline by adding fontSize*0.85
    const y = t.yPct * h + t.fontSize * 0.85;
    return `<text x="${t.xPct * w}" y="${y}" font-family="Inter, sans-serif" font-size="${t.fontSize}" font-weight="${weight}" fill="${t.color}" filter="url(#drop)">${escapeXml(t.text)}</text>`;
  }).join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${gradient}
  ${bgLayer}
  ${overlay}
  ${accent}
  ${textNodes}
</svg>`;

  const resvg = new Resvg(svg, {
    background: scene.backgroundFallbackHex,
    fitTo: { mode: "width", value: w },
    font: {
      loadSystemFonts: false, // deterministic — rely on bundled DejaVu fallback
    },
  });
  const png = resvg.render().asPng();
  return png;
}
