import { useState, useRef, useCallback } from "react";
import type { Overlay, ResizeHandlePosition, SnapGuide } from "./canvasTypes";

const HIT_PADDING = 8;
const HANDLE_SIZE = 8;
const HANDLE_HALF = HANDLE_SIZE / 2;

type DragState = {
  overlayId: string;
  offsetX: number;
  offsetY: number;
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

/** Get the bounding box of an overlay (with optional canvas context for text measurement) */
export function getOverlayBounds(
  o: Overlay,
  ctx?: CanvasRenderingContext2D | null
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
  bounds: { x: number; y: number; w: number; h: number }
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

/** Hit-test resize handles; returns the handle position if hit, null otherwise */
function hitTestHandles(
  mx: number,
  my: number,
  bounds: { x: number; y: number; w: number; h: number }
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

  // Hit test with padding
  const hitTest = useCallback(
    (mx: number, my: number): Overlay | null => {
      const ctx = canvasRef.current?.getContext("2d");
      for (let i = overlays.length - 1; i >= 0; i--) {
        const o = overlays[i];
        const b = getOverlayBounds(o, ctx);
        if (
          mx >= b.x - HIT_PADDING &&
          mx <= b.x + b.w + HIT_PADDING &&
          my >= b.y - HIT_PADDING &&
          my <= b.y + b.h + HIT_PADDING
        ) {
          return o;
        }
      }
      return null;
    },
    [overlays, canvasRef]
  );

  // Click-through: find next overlay under the same point
  const hitTestBelow = useCallback(
    (mx: number, my: number, currentId: string): Overlay | null => {
      const ctx = canvasRef.current?.getContext("2d");
      let foundCurrent = false;
      for (let i = overlays.length - 1; i >= 0; i--) {
        const o = overlays[i];
        const b = getOverlayBounds(o, ctx);
        const hit =
          mx >= b.x - HIT_PADDING &&
          mx <= b.x + b.w + HIT_PADDING &&
          my >= b.y - HIT_PADDING &&
          my <= b.y + b.h + HIT_PADDING;
        if (!hit) continue;
        if (o.id === currentId) {
          foundCurrent = true;
          continue;
        }
        if (foundCurrent) return o;
      }
      return null;
    },
    [overlays, canvasRef]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Check if clicking a resize handle of the selected overlay
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
        // Click-through cycling: if clicking an already-selected object, try to find one below
        if (hit.id === selectedId) {
          const below = hitTestBelow(mx, my, selectedId);
          if (below) {
            setSelectedId(below.id);
            if (!below.locked) {
              dragRef.current = { overlayId: below.id, offsetX: mx - below.x, offsetY: my - below.y };
              setCursorStyle("grabbing");
            }
            return;
          }
        }
        setSelectedId(hit.id);
        if (!hit.locked) {
          dragRef.current = { overlayId: hit.id, offsetX: mx - hit.x, offsetY: my - hit.y };
          setCursorStyle("grabbing");
        }
      } else {
        setSelectedId(null);
      }
    },
    [hitTest, hitTestBelow, selectedId, overlays, canvasRef, setSelectedId]
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

      // Drag mode
      if (dragRef.current) {
        const { overlayId, offsetX, offsetY } = dragRef.current;
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
    [hitTest, selectedId, overlays, canvasRef, snapOverlay, setGuides, setOverlaysLive]
  );

  const onMouseUp = useCallback(() => {
    if (dragRef.current || resizeRef.current) {
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
          dragRef.current = { overlayId: hit.id, offsetX: mx - hit.x, offsetY: my - hit.y };
        }
      } else {
        setSelectedId(null);
      }
    },
    [hitTest, canvasRef, setSelectedId]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const { overlayId, offsetX, offsetY } = dragRef.current;

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
    [canvasRef, snapOverlay, setGuides, setOverlaysLive]
  );

  const onTouchEnd = useCallback(() => {
    if (dragRef.current) {
      pushState(overlays);
      clearGuides();
    }
    dragRef.current = null;
  }, [overlays, pushState, clearGuides]);

  // Keyboard handler
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!selectedId) {
        // Tab to select first overlay
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
    [selectedId, overlays, deleteOverlay, updateOverlay, setSelectedId]
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
