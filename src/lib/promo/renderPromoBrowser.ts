// Browser-side rasterizer for a PromoScene. Mirrors the SVG server renderer
// (supabase/functions/_shared/promo/renderPromo.ts) — same layout math.
// Font parity was intentionally relaxed to "layout parity" (positions, sizes,
// colors, gradient). Both surfaces render with a plain sans-serif stack.

import type { PromoScene } from "./composePromoLayout";

/** "Diagonal Field" branded fallback. See PromoPlate in composePromoLayout for
 *  the design contract; this is the canvas rasterization of it. */
function drawPlate(ctx: CanvasRenderingContext2D, scene: PromoScene) {
  const { width: w, height: h, plate } = scene;

  // 1. Deep ink base
  ctx.fillStyle = plate.baseHex;
  ctx.fillRect(0, 0, w, h);

  // 2. Field polygon
  const pts = plate.fieldPoints.map(([x, y]) => [x * w, y * h] as [number, number]);
  const fieldPath = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
  };

  ctx.save();
  fieldPath();
  ctx.clip();

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, plate.fromHex);
  g.addColorStop(1, plate.toHex);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 3a. Grid (clipped to field)
  const step = plate.gridSpacingPct * w;
  ctx.strokeStyle = plate.gridColor;
  ctx.lineWidth = Math.max(1, w / 1080);
  ctx.beginPath();
  for (let x = step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();

  // 3b. Soft brand glow, upper right of the field
  const r = plate.glowRadiusPct * w;
  const glow = ctx.createRadialGradient(w * 0.78, h * 0.14, 0, w * 0.78, h * 0.14, r);
  glow.addColorStop(0, `${plate.glowColor}66`);
  glow.addColorStop(1, `${plate.glowColor}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // 3c. Off-canvas brand arcs
  for (const a of plate.arcs ?? []) {
    ctx.globalAlpha = a.opacity;
    ctx.strokeStyle = a.color;
    ctx.lineWidth = Math.max(1, a.widthPct * w);
    ctx.beginPath();
    ctx.arc(a.cxPct * w, a.cyPct * h, a.rPct * w, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 3d. Angular shards
  for (const s of plate.shards ?? []) {
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 3e. Halftone dot field, fading toward the diagonal edge
  const ht = plate.halftone;
  if (ht) {
    const step = ht.spacingPct * w;
    const maxR = ht.radiusPct * w;
    const y0 = ht.fromYPct * h;
    const y1 = ht.toYPct * h;
    ctx.fillStyle = ht.color;
    for (let y = y0, row = 0; y < y1; y += step, row++) {
      const t = 1 - (y - y0) / Math.max(1, y1 - y0); // 1 at top -> 0 at edge
      const rr = maxR * (0.35 + 0.65 * t);
      ctx.globalAlpha = ht.maxOpacity * t * t;
      for (let x = (row % 2 ? step / 2 : 0); x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // 3f. Parallel stripes running along the diagonal, above the edge
  const [, , [rx, ry], [lx, ly]] = pts;
  for (const s of plate.stripes) {
    const dy = s.offsetPct * h;
    const th = s.thicknessPct * h;
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(lx, ly - dy);
    ctx.lineTo(rx, ry - dy);
    ctx.lineTo(rx, ry - dy - th);
    ctx.lineTo(lx, ly - dy - th);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();


  // 4. Bright accent line along the diagonal edge
  ctx.strokeStyle = plate.edge.color;
  ctx.lineWidth = Math.max(2, plate.edge.widthPct * w);
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(rx, ry);
  ctx.stroke();
}


export async function renderPromoSceneToBlob(scene: PromoScene): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = scene.width;
  canvas.height = scene.height;
  const ctx = canvas.getContext("2d")!;

  // Background image (cover) or designed branded plate
  let drew = false;
  if (scene.backgroundUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = scene.backgroundUrl as string;
      });
      const scale = Math.max(scene.width / img.width, scene.height / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.drawImage(img, (scene.width - sw) / 2, (scene.height - sh) / 2, sw, sh);
      drew = true;
    } catch {
      drew = false;
    }
  }
  if (!drew) drawPlate(ctx, scene);

  // Bottom-anchored scrim — heavier when a photo/cover art is the background.
  const scrim = (drew ? scene.imageScrim : scene.plateScrim) ?? {
    startPct: scene.gradient.startPct,
    stops: [
      { offset: 0, color: scene.gradient.fromRgba },
      { offset: 1, color: scene.gradient.toRgba },
    ],
  };
  const grad = ctx.createLinearGradient(0, scene.height * scrim.startPct, 0, scene.height);
  for (const s of scrim.stops) grad.addColorStop(s.offset, s.color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, scene.width, scene.height);

  // Local copy panel — only over photo/cover art, so the key art keeps its
  // colour while the copy column still passes contrast.
  const cp = scene.copyPanel;
  if (drew && cp) {
    const x = cp.xPct * scene.width;
    const y = cp.yPct * scene.height;
    const pw = cp.wPct * scene.width;
    const ph = cp.hPct * scene.height;
    const r = cp.radiusPct * scene.width;
    const feather = Math.max(1, cp.featherPct * ph);

    const hg = ctx.createLinearGradient(x, 0, x + pw, 0);
    hg.addColorStop(0, cp.fromRgba);
    hg.addColorStop(0.62, cp.fromRgba.replace(/0?\.\d+\)$/, "0.5)"));
    hg.addColorStop(1, cp.toRgba);

    ctx.save();
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(x, y, pw, ph, r);
    } else {
      ctx.rect(x, y, pw, ph);
    }
    ctx.clip();
    ctx.fillStyle = hg;
    ctx.fillRect(x, y, pw, ph);

    // Soften the panel's top edge so it reads as a shadow, not a box.
    const vg = ctx.createLinearGradient(0, y, 0, y + feather);
    vg.addColorStop(0, "rgba(0,0,0,1)");
    vg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = vg;
    ctx.fillRect(x, y, pw, feather);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  // Accent bar
  const ab = scene.accentBar;
  ctx.fillStyle = ab.color;
  ctx.fillRect(ab.xPct * scene.width, ab.yPct * scene.height, ab.wPct * scene.width, ab.hPct * scene.height);

  // Texts
  ctx.textBaseline = "top";
  for (const t of scene.texts) {
    const weight = t.fontWeight === "bold" ? "bold " : "";
    ctx.font = `${weight}${t.fontSize}px sans-serif`;
    ctx.fillStyle = t.color;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(t.text, t.xPct * scene.width, t.yPct * scene.height);
    ctx.shadowColor = "transparent";
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))), "image/png");
  });
}
