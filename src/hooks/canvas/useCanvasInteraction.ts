import { useState, useRef, useCallback } from "react";
import type { Overlay, ResizeHandlePosition, SnapGuide } from "./canvasTypes";

const HIT_PADDING = 8;
const HANDLE_SIZE = 8;
const HANDLE_HALF = HANDLE_SIZE / 2;
const DRAG_THRESHOLD = 4; // pixels before drag starts

type DragState = {
  overlayId: string;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  hasMoved: boolean;
} | null;

type ResizeState = {
  overlayId: string;
  handle: ResizeHandlePosition;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
} | null;

// ─── Geometry-aware hit testing ────────────────────────────────────────

/** Point-in-ellipse test (used for circle shapes) */
function hitEllipse(
  mx: number, my: number,
  cx: number, cy: number,
  rx: number, ry: number,
  padding: number,
): boolean {
  const dx = mx - cx;
  const dy = my - cy;
  const rxP = rx + padding;
  const ryP = ry + padding;
  return (dx * dx) / (rxP * rxP) + (dy * dy) / (ryP * ryP) <= 1;
}

/** Shortest distance from a point to a line segment */
function distToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Geometry-aware hit test for a single overlay. Returns true if the point is inside the visible shape. */
function hitTestOverlay(
  mx: number,
  my: number,
  o: Overlay,
  ctx?: CanvasRenderingContext2D | null,
): boolean {
  if (o.type === "shape") {
    if (o.shape === "circle") {
      const cx = o.x + o.width / 2;
      const cy = o.y + o.height / 2;
      return hitEllipse(mx, my, cx, cy, o.width / 2, o.height / 2, HIT_PADDING);
    }
    if (o.shape === "line") {
      const d = distToSegment(mx, my, o.x, o.y, o.x + o.width, o.y + o.height);
      return d <= Math.max(HIT_PADDING, (o.strokeWidth || 2) / 2 + 4);
    }
    // rect — standard bounding box
    return (
      mx >= o.x - HIT_PADDING &&
      mx <= o.x + o.width + HIT_PADDING &&
      my >= o.y - HIT_PADDING &&
      my <= o.y + o.height + HIT_PADDING
    );
  }

  if (o.type === "logo") {
    return (
      mx >= o.x - HIT_PADDING &&
      mx <= o.x + o.width + HIT_PADDING &&
      my >= o.y - HIT_PADDING &&
      my <= o.y + o.height + HIT_PADDING
    );
  }

  // text — use measured width when possible
  if (ctx) {
    ctx.font = `${o.fontSize}px ${o.fontFamily}`;
    const w = ctx.measureText(o.text).width;
    return (
      mx >= o.x - HIT_PADDING &&
      mx <= o.x + w + HIT_PADDING &&
      my >= o.y - HIT_PADDING &&
      my <= o.y + o.fontSize + HIT_PADDING
    );
  }
  // fallback
  const approxW = o.fontSize * o.text.length * 0.6;
  return (
    mx >= o.x - HIT_PADDING &&
    mx <= o.x + approxW + HIT_PADDING &&
    my >= o.y - HIT_PADDING &&
    my <= o.y + o.fontSize + HIT_PADDING
  );
}

/** Compute the visual area of an overlay (used for "smallest wins" tie-breaking) */
function overlayArea(o: Overlay, ctx?: CanvasRenderingContext2D | null): number {
  if (o.type === "logo" || o.type === "shape") return o.width * o.height;
  if (ctx) {
    ctx.font = `${o.fontSize}px ${o.fontFamily}`;
    return ctx.measureText(o.text).width * o.fontSize;
  }
  return o.fontSize * o.text.length * 0.6 * o.fontSize;
}

// ─── Bounding-box helpers (used for selection/resize visuals) ──────────

/** Get the bounding box of an overlay */
export function getOverlayBounds(
  o: Overlay,
  ctx?: CanvasRenderingContext2D | null,
): { x: number; y: number; w: number; h: number } {
  if (o.type === "logo" || o.type === "shape") {
    return { x: o.x, y: o.y, w: o.width, h: o.height };
  }
  if (ctx) {
    ctx.font = `${o.fontSize}px ${o.fontFamily}`;
    const w = ctx.measureText(o.text).width;
    return { x: o.x, y: o.y, w, h: o.fontSize };
  }
  return { x: o.x, y: o.y, w: o.fontSize * o.text.length * 0.6, h: o.fontSize };
}

/** Compute the 8 resize handle rects for a bounding box */
export function getResizeHandles(
  bounds: { x: number; y: number; w: number; h: number },
): Array<{ pos: ResizeHandlePosition; cx: number; cy: number }> {
  const { x, y, w, h } = bounds;
  return [
    { pos: "nw", cx: x, cy: y },
    { pos: "n", cx: x + w / 2, cy: y },
    { pos: "ne", cx: x + w, cy: y },
    { pos: "e", cx: x + w, cy: y + h / 2 },
    { pos: "se", cx: x + w, cy: y + h },
    { pos: "s", cx: x + w / 2, cy: y + h },
    { pos: "sw", cx: x, cy: y + h },
    { pos: "w", cx: x, cy: y + h / 2 },
  ];
}

/** Hit-test resize handles */
function hitTestHandles(
  mx: number,
  my: number,
  bounds: { x: number; y: number; w: number; h: number },
): ResizeHandlePosition | null {
  const handles = getResizeHandles(bounds);
  for (const h of handles) {
    if (
      mx >= h.cx - HANDLE_HALF - 2 &&
      mx <= h.cx + HANDLE_HALF + 2 &&
      my >= h.cy - HANDLE_HALF - 2 &&
      my <= h.cy + HANDLE_HALF + 2
    ) {
      return h.pos;
    }
  }
  return null;
}

/** Cursor for a given resize handle */
export function handleCursor(pos: ResizeHandlePosition): string {
  const map: Record<ResizeHandlePosition, string> = {
    nw: "nwse-resize",
    se: "nwse-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize",
  };
  return map[pos];
}

// ─── Coordinate scaling ────────────────────────────────────────────────

/** Convert CSS mouse/touch position to canvas-space coordinates */
function getCanvasCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  rect: DOMRect,
): { mx: number; my: number } {
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    mx: (clientX - rect.left) * scaleX,
    my: (clientY - rect.top) * scaleY,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  overlays: Overlay[],
  selectedId: string | null,
  setSelectedId: (id: string | null) => void,
  pushState: (overlays: Overlay[]) => void,
  setOverlaysLive: (fn: (prev: Overlay[]) => Overlay[]) => void,
  snapOverlay: (o: Overlay, others: Overlay[], ctx?: CanvasRenderingContext2D | null) => { dx: number; dy: number; guides: SnapGuide[] },
  setGuides: (g: SnapGuide[]) => void,
  clearGuides: () => void,
  deleteOverlay: (id: string) => void,
  updateOverlay: (id: string, updates: Record<string, unknown>) => void,
) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cursorStyle, setCursorStyle] = useState<string>("default");
  const dragRef = useRef<DragState>(null);
  const resizeRef = useRef<ResizeState>(null);

  // ── Hit test: geometry-aware, returns ALL candidates sorted by z-order (top first) ──
  const hitTestAll = useCallback(
    (mx: number, my: number): Overlay[] => {
      const ctx = canvasRef.current?.getContext("2d");
      const hits: Overlay[] = [];
      for (let i = overlays.length - 1; i >= 0; i--) {
        const o = overlays[i];
        if (hitTestOverlay(mx, my, o, ctx)) {
          hits.push(o);
        }
      }
      return hits;
    },
    [overlays, canvasRef],
  );

  // Pick the best candidate: prefer smallest among top-z hits
  const hitTest = useCallback(
    (mx: number, my: number): Overlay | null => {
      const hits = hitTestAll(mx, my);
      if (hits.length === 0) return null;
      if (hits.length === 1) return hits[0];

      // Among candidates, prefer the one with the smallest area (more precise pick)
      const ctx = canvasRef.current?.getContext("2d");
      let best = hits[0];
      let bestArea = overlayArea(best, ctx);
      for (let i = 1; i < hits.length; i++) {
        const a = overlayArea(hits[i], ctx);
        if (a < bestArea) {
          best = hits[i];
          bestArea = a;
        }
      }
      return best;
    },
    [hitTestAll, canvasRef],
  );

  // Cycle to the next candidate below the current selection
  const hitTestBelow = useCallback(
    (mx: number, my: number, currentId: string): Overlay | null => {
      const hits = hitTestAll(mx, my);
      const curIdx = hits.findIndex((o) => o.id === currentId);
      if (curIdx === -1 || hits.length <= 1) return null;
      // Wrap around to the next candidate
      return hits[(curIdx + 1) % hits.length];
    },
    [hitTestAll],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      if (!canvas || !rect) return;
      const { mx, my } = getCanvasCoords(e.clientX, e.clientY, canvas, rect);

      // Check resize handles on selected overlay
      if (selectedId) {
        const selOverlay = overlays.find((o) => o.id === selectedId);
        if (selOverlay && (selOverlay.type === "logo" || selOverlay.type === "shape")) {
          const ctx = canvasRef.current?.getContext("2d");
          const bounds = getOverlayBounds(selOverlay, ctx);
          const handle = hitTestHandles(mx, my, bounds);
          if (handle && !selOverlay.locked) {
            resizeRef.current = {
              overlayId: selectedId,
              handle,
              startX: mx,
              startY: my,
              origX: selOverlay.x,
              origY: selOverlay.y,
              origW: selOverlay.width,
              origH: selOverlay.height,
            };
            setCursorStyle(handleCursor(handle));
            return;
          }
        }
      }

      const hit = hitTest(mx, my);
      if (hit) {
        // Click-through cycling when clicking an already-selected object
        if (hit.id === selectedId) {
          const below = hitTestBelow(mx, my, selectedId);
          if (below) {
            setSelectedId(below.id);
            if (!below.locked) {
              dragRef.current = {
                overlayId: below.id,
                offsetX: mx - below.x,
                offsetY: my - below.y,
                startX: mx,
                startY: my,
                hasMoved: false,
              };
            }
            return;
          }
        }
        setSelectedId(hit.id);
        if (!hit.locked) {
          dragRef.current = {
            overlayId: hit.id,
            offsetX: mx - hit.x,
            offsetY: my - hit.y,
            startX: mx,
            startY: my,
            hasMoved: false,
          };
        }
      } else {
        setSelectedId(null);
      }
    },
    [hitTest, hitTestBelow, selectedId, overlays, canvasRef, setSelectedId],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Resize mode
      if (resizeRef.current) {
        const { overlayId, handle, startX, startY, origX, origY, origW, origH } = resizeRef.current;
        const dx = mx - startX;
        const dy = my - startY;

        setOverlaysLive((prev) => {
          const idx = prev.findIndex((o) => o.id === overlayId);
          if (idx === -1) return prev;
          const o = prev[idx];
          if (o.type !== "logo" && o.type !== "shape") return prev;

          let newX = origX, newY = origY, newW = origW, newH = origH;

          if (handle.includes("e")) newW = Math.max(10, origW + dx);
          if (handle.includes("w")) { newW = Math.max(10, origW - dx); newX = origX + (origW - newW); }
          if (handle.includes("s")) newH = Math.max(10, origH + dy);
          if (handle.includes("n")) { newH = Math.max(10, origH - dy); newY = origY + (origH - newH); }

          // Maintain aspect ratio for logos
          if (o.type === "logo") {
            const ratio = origH / origW;
            if (handle === "n" || handle === "s") {
              newW = Math.round(newH / ratio);
            } else {
              newH = Math.round(newW * ratio);
            }
            if (handle.includes("n")) newY = origY + origH - newH;
            if (handle.includes("w")) newX = origX + origW - newW;
          }

          const next = [...prev];
          next[idx] = { ...o, x: newX, y: newY, width: newW, height: newH } as Overlay;
          return next;
        });
        return;
      }

      // Drag mode — only start moving after threshold
      if (dragRef.current) {
        const drag = dragRef.current;
        if (!drag.hasMoved) {
          const dist = Math.hypot(mx - drag.startX, my - drag.startY);
          if (dist < DRAG_THRESHOLD) {
            // Haven't moved enough — don't drag yet
            return;
          }
          drag.hasMoved = true;
          setCursorStyle("grabbing");
        }

        const { overlayId, offsetX, offsetY } = drag;
        setOverlaysLive((prev) => {
          const idx = prev.findIndex((o) => o.id === overlayId);
          if (idx === -1) return prev;
          const current = prev[idx];
          if (current.locked) return prev;
          const dragged = { ...current, x: mx - offsetX, y: my - offsetY };
          const ctx = canvasRef.current?.getContext("2d");
          const { dx: snapDx, dy: snapDy, guides: newGuides } = snapOverlay(dragged as Overlay, prev, ctx);
          dragged.x += snapDx;
          dragged.y += snapDy;
          setGuides(newGuides);
          const next = [...prev];
          next[idx] = dragged as Overlay;
          return next;
        });
        return;
      }

      // Hover: check handle cursor first, then overlay hover
      if (selectedId) {
        const selOverlay = overlays.find((o) => o.id === selectedId);
        if (selOverlay && (selOverlay.type === "logo" || selOverlay.type === "shape")) {
          const ctx = canvasRef.current?.getContext("2d");
          const bounds = getOverlayBounds(selOverlay, ctx);
          const handle = hitTestHandles(mx, my, bounds);
          if (handle) {
            setCursorStyle(handleCursor(handle));
            setHoveredId(null);
            return;
          }
        }
      }

      const hover = hitTest(mx, my);
      if (hover) {
        setHoveredId(hover.id);
        setCursorStyle(hover.locked ? "not-allowed" : "grab");
      } else {
        setHoveredId(null);
        setCursorStyle("default");
      }
    },
    [hitTest, selectedId, overlays, canvasRef, snapOverlay, setGuides, setOverlaysLive],
  );

  const onMouseUp = useCallback(() => {
    if (dragRef.current?.hasMoved || resizeRef.current) {
      pushState(overlays);
      clearGuides();
    }
    dragRef.current = null;
    resizeRef.current = null;
    setCursorStyle("default");
  }, [overlays, pushState, clearGuides]);

  // Touch handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const hit = hitTest(mx, my);
      if (hit) {
        e.preventDefault();
        setSelectedId(hit.id);
        if (!hit.locked) {
          dragRef.current = {
            overlayId: hit.id,
            offsetX: mx - hit.x,
            offsetY: my - hit.y,
            startX: mx,
            startY: my,
            hasMoved: false,
          };
        }
      } else {
        setSelectedId(null);
      }
    },
    [hitTest, canvasRef, setSelectedId],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return;
      const drag = dragRef.current;
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;

      if (!drag.hasMoved) {
        const dist = Math.hypot(mx - drag.startX, my - drag.startY);
        if (dist < DRAG_THRESHOLD) return;
        drag.hasMoved = true;
      }

      e.preventDefault();
      const { overlayId, offsetX, offsetY } = drag;

      setOverlaysLive((prev) => {
        const idx = prev.findIndex((o) => o.id === overlayId);
        if (idx === -1) return prev;
        const current = prev[idx];
        if (current.locked) return prev;
        const dragged = { ...current, x: mx - offsetX, y: my - offsetY };
        const ctx = canvasRef.current?.getContext("2d");
        const { dx, dy, guides: newGuides } = snapOverlay(dragged as Overlay, prev, ctx);
        dragged.x += dx;
        dragged.y += dy;
        setGuides(newGuides);
        const next = [...prev];
        next[idx] = dragged as Overlay;
        return next;
      });
    },
    [canvasRef, snapOverlay, setGuides, setOverlaysLive],
  );

  const onTouchEnd = useCallback(() => {
    if (dragRef.current?.hasMoved) {
      pushState(overlays);
      clearGuides();
    }
    dragRef.current = null;
  }, [overlays, pushState, clearGuides]);

  // Keyboard handler
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!selectedId) {
        if (e.key === "Tab" && overlays.length > 0) {
          e.preventDefault();
          setSelectedId(overlays[overlays.length - 1].id);
        }
        return;
      }

      const sel = overlays.find((o) => o.id === selectedId);
      if (!sel) return;

      switch (e.key) {
        case "Delete":
        case "Backspace":
          e.preventDefault();
          deleteOverlay(selectedId);
          break;
        case "Escape":
          e.preventDefault();
          setSelectedId(null);
          break;
        case "Tab": {
          e.preventDefault();
          const idx = overlays.findIndex((o) => o.id === selectedId);
          const nextIdx = e.shiftKey
            ? (idx - 1 + overlays.length) % overlays.length
            : (idx + 1) % overlays.length;
          setSelectedId(overlays[nextIdx].id);
          break;
        }
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight": {
          if (sel.locked) break;
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          updateOverlay(selectedId, { x: sel.x + dx, y: sel.y + dy });
          break;
        }
      }
    },
    [selectedId, overlays, deleteOverlay, updateOverlay, setSelectedId],
  );

  return {
    hoveredId,
    cursorStyle,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onKeyDown,
  };
}
