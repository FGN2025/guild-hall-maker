// Browser-side rasterizer for a PromoScene. Mirrors the SVG server renderer
// (supabase/functions/_shared/promo/renderPromo.ts) — same layout math.
// Font parity was intentionally relaxed to "layout parity" (positions, sizes,
// colors, gradient). Both surfaces render with a plain sans-serif stack.

import type { PromoScene } from "./composePromoLayout";

export async function renderPromoSceneToBlob(scene: PromoScene): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = scene.width;
  canvas.height = scene.height;
  const ctx = canvas.getContext("2d")!;

  // Background image (cover) or fallback fill
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
    } catch {
      ctx.fillStyle = scene.backgroundFallbackHex;
      ctx.fillRect(0, 0, scene.width, scene.height);
    }
  } else {
    ctx.fillStyle = scene.backgroundFallbackHex;
    ctx.fillRect(0, 0, scene.width, scene.height);
  }

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
