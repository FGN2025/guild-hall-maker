import { useCallback, useState } from "react";
import type { Overlay, SnapGuide } from "./canvasTypes";

const SNAP_THRESHOLD = 6;

type Rect = { x: number; y: number; w: number; h: number };

function getRect(o: Overlay, ctx?: CanvasRenderingContext2D | null): Rect {
  if (o.type === "logo") return { x: o.x, y: o.y, w: o.width, h: o.height };
  const w = ctx ? ctx.measureText(o.text).width : o.fontSize * o.text.length * 0.6;
  return { x: o.x, y: o.y, w, h: o.fontSize };
}

export function useCanvasSnap(canvasWidth: number, canvasHeight: number) {
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  const snapOverlay = useCallback(
    (
      dragged: Overlay,
      others: Overlay[],
      ctx?: CanvasRenderingContext2D | null
    ): { dx: number; dy: number; guides: SnapGuide[] } => {
      const r = getRect(dragged, ctx);
      const centerX = r.x + r.w / 2;
      const centerY = r.y + r.h / 2;
      const rightX = r.x + r.w;
      const bottomY = r.y + r.h;

      // Candidate snap points: canvas edges + center + other overlay edges/centers
      const xAnchors: number[] = [0, canvasWidth / 2, canvasWidth];
      const yAnchors: number[] = [0, canvasHeight / 2, canvasHeight];

      others.forEach((o) => {
        if (o.id === dragged.id) return;
        const or = getRect(o, ctx);
        xAnchors.push(or.x, or.x + or.w / 2, or.x + or.w);
        yAnchors.push(or.y, or.y + or.h / 2, or.y + or.h);
      });

      let bestDx = 0;
      let bestDistX = Infinity;
      let snapXPos: number | null = null;

      // Check left, center, right of dragged rect against each anchor
      for (const anchor of xAnchors) {
        for (const edge of [r.x, centerX, rightX]) {
          const dist = Math.abs(edge - anchor);
          if (dist < SNAP_THRESHOLD && dist < bestDistX) {
            bestDistX = dist;
            bestDx = anchor - edge;
            snapXPos = anchor;
          }
        }
      }

      let bestDy = 0;
      let bestDistY = Infinity;
      let snapYPos: number | null = null;

      for (const anchor of yAnchors) {
        for (const edge of [r.y, centerY, bottomY]) {
          const dist = Math.abs(edge - anchor);
          if (dist < SNAP_THRESHOLD && dist < bestDistY) {
            bestDistY = dist;
            bestDy = anchor - edge;
            snapYPos = anchor;
          }
        }
      }

      const newGuides: SnapGuide[] = [];
      if (snapXPos !== null) newGuides.push({ orientation: "vertical", position: snapXPos });
      if (snapYPos !== null) newGuides.push({ orientation: "horizontal", position: snapYPos });

      return { dx: bestDx, dy: bestDy, guides: newGuides };
    },
    [canvasWidth, canvasHeight]
  );

  const clearGuides = useCallback(() => setGuides([]), []);

  return { guides, setGuides, snapOverlay, clearGuides };
}
