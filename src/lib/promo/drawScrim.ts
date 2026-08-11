// The bottom scrim (dark gradient + local copy panel + accent bar) used to be
// BAKED into the composed plate PNG, so panning/zooming the background dragged
// the shadow along with the artwork. It is now an independent, canvas-fixed
// layer: the plate is rendered scrim-free and the editor paints the scrim from
// this spec at percentage coordinates of the CURRENT canvas.

import type { PromoScene } from "./composePromoLayout";

export type ScrimSpec = {
  startPct: number;
  stops: Array<{ offset: number; color: string }>;
  copyPanel?: {
    xPct: number; yPct: number; wPct: number; hPct: number;
    radiusPct: number; featherPct: number; fromRgba: string; toRgba: string;
  } | null;
  accentBar?: { xPct: number; yPct: number; wPct: number; hPct: number; color: string } | null;
};

/** Extract the fixed scrim layer from a composed scene. */
export function scrimFromScene(scene: PromoScene, hasImageBackground: boolean): ScrimSpec {
  const scrim = (hasImageBackground ? scene.imageScrim : scene.plateScrim) ?? {
    startPct: scene.gradient.startPct,
    stops: [
      { offset: 0, color: scene.gradient.fromRgba },
      { offset: 1, color: scene.gradient.toRgba },
    ],
  };
  return {
    startPct: scrim.startPct,
    stops: scrim.stops.map((s) => ({ offset: s.offset, color: s.color })),
    copyPanel: hasImageBackground && scene.copyPanel ? { ...scene.copyPanel } : null,
    accentBar: scene.accentBar ? { ...scene.accentBar } : null,
  };
}

/** Paint the scrim onto a 2D context sized w x h. Position is always relative
 *  to the canvas, never to the background image. */
export function drawScrim(ctx: CanvasRenderingContext2D, w: number, h: number, spec: ScrimSpec) {
  if (!spec) return;

  if (spec.stops?.length) {
    const grad = ctx.createLinearGradient(0, h * (spec.startPct ?? 0), 0, h);
    for (const s of spec.stops) grad.addColorStop(s.offset, s.color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  const cp = spec.copyPanel;
  if (cp) {
    const x = cp.xPct * w;
    const y = cp.yPct * h;
    const pw = cp.wPct * w;
    const ph = cp.hPct * h;
    const r = cp.radiusPct * w;
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
    ctx.fillRect(x, y + feather, pw, ph - feather);
    const strips = 28;
    for (let i = 0; i < strips; i++) {
      ctx.globalAlpha = (i + 0.5) / strips;
      ctx.fillRect(x, y + (i / strips) * feather, pw, feather / strips + 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  const ab = spec.accentBar;
  if (ab) {
    ctx.fillStyle = ab.color;
    ctx.fillRect(ab.xPct * w, ab.yPct * h, ab.wPct * w, ab.hPct * h);
  }
}
