// Browser-side rasterizer for a PromoScene. Mirrors the SVG server renderer
// (supabase/functions/_shared/promo/renderPromo.ts) — same layout math.
// Font parity was intentionally relaxed to "layout parity" (positions, sizes,
// colors, gradient). Both surfaces render with a plain sans-serif stack.

import type { PromoScene } from "./composePromoLayout";

/** Designed branded fallback: diagonal brand gradient + soft glow + grid.
 *  Used whenever the event has no usable cover art, so a missing image still
 *  yields a publishable graphic instead of flat empty navy. */
function drawPlate(ctx: CanvasRenderingContext2D, scene: PromoScene) {
  const { width: w, height: h, plate } = scene;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, plate.fromHex);
  g.addColorStop(1, plate.toHex);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft brand glow, top-right
  const r = plate.glowRadiusPct * w;
  const glow = ctx.createRadialGradient(w * 0.82, h * 0.16, 0, w * 0.82, h * 0.16, r);
  glow.addColorStop(0, `${plate.glowColor}55`);
  glow.addColorStop(1, `${plate.glowColor}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  const step = plate.gridSpacingPct * w;
  ctx.strokeStyle = plate.gridColor;
  ctx.lineWidth = Math.max(1, w / 1080);
  ctx.beginPath();
  for (let x = step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
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

  // Bottom-anchored gradient
  const grad = ctx.createLinearGradient(0, scene.height * scene.gradient.startPct, 0, scene.height);
  grad.addColorStop(0, scene.gradient.fromRgba);
  grad.addColorStop(1, scene.gradient.toRgba);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, scene.width, scene.height);

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
