import { useState, useRef, useCallback, useEffect } from "react";
import { useCanvasHistory } from "./canvas/useCanvasHistory";
import { useCanvasSnap } from "./canvas/useCanvasSnap";
import { useCanvasInteraction, getOverlayBounds, getResizeHandles } from "./canvas/useCanvasInteraction";
import type { Overlay, LogoOverlay, TextOverlay, ShapeOverlay, SnapGuide, CanvasFormat } from "./canvas/canvasTypes";
import { CANVAS_FORMATS } from "./canvas/canvasTypes";

export type { Overlay, LogoOverlay, TextOverlay, ShapeOverlay, SnapGuide, CanvasFormat };
export { CANVAS_FORMATS };

/** Compute center-crop source rect from image into target aspect ratio */
function centerCropRect(
  imgW: number, imgH: number, targetW: number, targetH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const targetAspect = targetW / targetH;
  const imgAspect = imgW / imgH;
  let sw: number, sh: number, sx: number, sy: number;
  if (imgAspect > targetAspect) {
    sh = imgH;
    sw = imgH * targetAspect;
    sx = (imgW - sw) / 2;
    sy = 0;
  } else {
    sw = imgW;
    sh = imgW / targetAspect;
    sx = 0;
    sy = (imgH - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

export type BgTransform = { zoom: number; offsetX: number; offsetY: number };

export const DEFAULT_BG_TRANSFORM: BgTransform = { zoom: 1, offsetX: 0, offsetY: 0 };

/** Source rect for the background, honouring manual zoom + pan.
 *  offsetX/offsetY are normalized to the image's own dimensions so the framing
 *  survives format switches and export upscaling. */
export function computeSourceRect(
  imgW: number, imgH: number, targetW: number, targetH: number, t: BgTransform
): { sx: number; sy: number; sw: number; sh: number } {
  const base = centerCropRect(imgW, imgH, targetW, targetH);
  const zoom = Math.max(1, t.zoom || 1);
  const sw = base.sw / zoom;
  const sh = base.sh / zoom;
  let sx = base.sx + (base.sw - sw) / 2 + (t.offsetX || 0) * imgW;
  let sy = base.sy + (base.sh - sh) / 2 + (t.offsetY || 0) * imgH;
  sx = Math.min(Math.max(sx, 0), Math.max(0, imgW - sw));
  sy = Math.min(Math.max(sy, 0), Math.max(0, imgH - sh));
  return { sx, sy, sw, sh };
}

/** Build a path for polygon-based shapes */
function buildShapePath(ctx: CanvasRenderingContext2D, o: ShapeOverlay, scaleX: number, scaleY: number) {
  const x = o.x * scaleX;
  const y = o.y * scaleY;
  const w = o.width * scaleX;
  const h = o.height * scaleY;

  ctx.beginPath();
  switch (o.shape) {
    case "triangle":
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      break;
    case "rounded-rect": {
      const r = Math.min((o.cornerRadius ?? 12) * scaleX, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      break;
    }
    case "arrow": {
      const headW = w * 0.35;
      const shaftH = h * 0.35;
      const shaftTop = y + (h - shaftH) / 2;
      ctx.moveTo(x, shaftTop);
      ctx.lineTo(x + w - headW, shaftTop);
      ctx.lineTo(x + w - headW, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w - headW, y + h);
      ctx.lineTo(x + w - headW, shaftTop + shaftH);
      ctx.lineTo(x, shaftTop + shaftH);
      ctx.closePath();
      break;
    }
    case "star": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const outerRx = w / 2;
      const outerRy = h / 2;
      const innerRx = outerRx * 0.38;
      const innerRy = outerRy * 0.38;
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 2) * -1 + (i * Math.PI) / 5;
        const rx = i % 2 === 0 ? outerRx : innerRx;
        const ry = i % 2 === 0 ? outerRy : innerRy;
        const px = cx + Math.cos(angle) * rx;
        const py = cy + Math.sin(angle) * ry;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "hexagon": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + (w / 2) * Math.cos(angle);
        const py = cy + (h / 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    default:
      return false;
  }
  return true;
}

/** Draw a single shape overlay onto a canvas context */
function drawShape(ctx: CanvasRenderingContext2D, o: ShapeOverlay, scaleX = 1, scaleY = 1) {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = o.opacity;
  const x = o.x * scaleX;
  const y = o.y * scaleY;
  const w = o.width * scaleX;
  const h = o.height * scaleY;

  if (o.shape === "rect") {
    if (o.fillColor) {
      ctx.fillStyle = o.fillColor;
      ctx.fillRect(x, y, w, h);
    }
    if (o.strokeWidth > 0 && o.strokeColor) {
      ctx.strokeStyle = o.strokeColor;
      ctx.lineWidth = o.strokeWidth * scaleX;
      ctx.strokeRect(x, y, w, h);
    }
  } else if (o.shape === "circle") {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (o.fillColor) {
      ctx.fillStyle = o.fillColor;
      ctx.fill();
    }
    if (o.strokeWidth > 0 && o.strokeColor) {
      ctx.strokeStyle = o.strokeColor;
      ctx.lineWidth = o.strokeWidth * scaleX;
      ctx.stroke();
    }
  } else if (o.shape === "line") {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.strokeStyle = o.strokeColor || "#ffffff";
    ctx.lineWidth = (o.strokeWidth || 2) * scaleX;
    ctx.stroke();
  } else if (buildShapePath(ctx, o, scaleX, scaleY)) {
    if (o.fillColor) {
      ctx.fillStyle = o.fillColor;
      ctx.fill();
    }
    if (o.strokeWidth > 0 && o.strokeColor) {
      ctx.strokeStyle = o.strokeColor;
      ctx.lineWidth = o.strokeWidth * scaleX;
      ctx.stroke();
    }
  }

  ctx.globalAlpha = prevAlpha;
}

const HANDLE_SIZE = 8;

export function useCanvasEditor(initialBaseImageUrl?: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { overlays, pushState, setOverlaysLive, undo, redo, canUndo, canRedo } = useCanvasHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [activeFormat, setActiveFormat] = useState<CanvasFormat>(CANVAS_FORMATS[0]);
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [bgOpacity, setBgOpacity] = useState(1);
  const [bgTransform, setBgTransform] = useState<BgTransform>(DEFAULT_BG_TRANSFORM);
  const bgTransformRef = useRef<BgTransform>(DEFAULT_BG_TRANSFORM);
  bgTransformRef.current = bgTransform;
  const [baseImageUrl, setBaseImageUrlState] = useState(initialBaseImageUrl);
  const { guides, setGuides, snapOverlay, clearGuides } = useCanvasSnap(canvasSize.width, canvasSize.height);

  // ── Background pan / zoom ────────────────────────────────────────────────
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  baseImageRef.current = baseImage;
  const canvasSizeRef = useRef(canvasSize);
  canvasSizeRef.current = canvasSize;

  /** Clamp an offset so the source rect can never leave the image. */
  const clampTransform = useCallback((t: BgTransform): BgTransform => {
    const img = baseImageRef.current;
    const cs = canvasSizeRef.current;
    if (!img || !cs.width || !cs.height) return t;
    const r = computeSourceRect(img.naturalWidth, img.naturalHeight, cs.width, cs.height, t);
    const base = centerCropRect(img.naturalWidth, img.naturalHeight, cs.width, cs.height);
    const zoom = Math.max(1, t.zoom || 1);
    const centeredX = base.sx + (base.sw - base.sw / zoom) / 2;
    const centeredY = base.sy + (base.sh - base.sh / zoom) / 2;
    return {
      zoom,
      offsetX: (r.sx - centeredX) / img.naturalWidth,
      offsetY: (r.sy - centeredY) / img.naturalHeight,
    };
  }, []);

  /** Drag the background by a delta expressed in canvas pixels. */
  const panBackground = useCallback((dxPx: number, dyPx: number) => {
    const img = baseImageRef.current;
    const cs = canvasSizeRef.current;
    if (!img || !cs.width || !cs.height) return;
    const t = bgTransformRef.current;
    const r = computeSourceRect(img.naturalWidth, img.naturalHeight, cs.width, cs.height, t);
    const next = clampTransform({
      zoom: t.zoom,
      offsetX: t.offsetX - (dxPx * (r.sw / cs.width)) / img.naturalWidth,
      offsetY: t.offsetY - (dyPx * (r.sh / cs.height)) / img.naturalHeight,
    });
    bgTransformRef.current = next;
    setBgTransform(next);
  }, [clampTransform]);

  /** Zoom by a multiplicative factor, keeping the point under (px, py) fixed. */
  const zoomBackgroundAt = useCallback((factor: number, px?: number, py?: number) => {
    const img = baseImageRef.current;
    const cs = canvasSizeRef.current;
    if (!img || !cs.width || !cs.height) return;
    const t = bgTransformRef.current;
    const nextZoom = Math.min(4, Math.max(1, (t.zoom || 1) * factor));
    if (nextZoom === t.zoom) return;
    const ax = px ?? cs.width / 2;
    const ay = py ?? cs.height / 2;
    const before = computeSourceRect(img.naturalWidth, img.naturalHeight, cs.width, cs.height, t);
    // Source point currently under the cursor
    const srcX = before.sx + (ax / cs.width) * before.sw;
    const srcY = before.sy + (ay / cs.height) * before.sh;

    const probe = computeSourceRect(
      img.naturalWidth, img.naturalHeight, cs.width, cs.height,
      { zoom: nextZoom, offsetX: t.offsetX, offsetY: t.offsetY },
    );
    // Desired top-left so srcX/srcY still sits under the cursor
    const wantSx = srcX - (ax / cs.width) * probe.sw;
    const wantSy = srcY - (ay / cs.height) * probe.sh;
    const next = clampTransform({
      zoom: nextZoom,
      offsetX: t.offsetX + (wantSx - probe.sx) / img.naturalWidth,
      offsetY: t.offsetY + (wantSy - probe.sy) / img.naturalHeight,
    });
    bgTransformRef.current = next;
    setBgTransform(next);
  }, [clampTransform]);

  const setBgZoom = useCallback((zoom: number) => {
    const t = bgTransformRef.current;
    zoomBackgroundAt(Math.max(1, zoom) / (t.zoom || 1));
  }, [zoomBackgroundAt]);

  const resetBackgroundTransform = useCallback(() => {
    bgTransformRef.current = DEFAULT_BG_TRANSFORM;
    setBgTransform(DEFAULT_BG_TRANSFORM);
  }, []);

  const applyBgTransform = useCallback((t: Partial<BgTransform> | null | undefined) => {
    if (!t) return;
    const next = {
      zoom: Math.min(4, Math.max(1, t.zoom ?? 1)),
      offsetX: t.offsetX ?? 0,
      offsetY: t.offsetY ?? 0,
    };
    bgTransformRef.current = next;
    setBgTransform(next);
  }, []);



  // Update overlay helper for keyboard handler
  const updateOverlay = useCallback((id: string, updates: Record<string, unknown>) => {
    const next = overlays.map((o) => {
      if (o.id !== id) return o;
      if (o.type === "logo") return { ...o, ...updates } as LogoOverlay;
      if (o.type === "shape") return { ...o, ...updates } as ShapeOverlay;
      return { ...o, ...updates } as TextOverlay;
    });
    pushState(next);
  }, [overlays, pushState]);

  // Delete overlay helper
  const deleteOverlay = useCallback(
    (id: string) => {
      pushState(overlays.filter((o) => o.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [overlays, selectedId, pushState]
  );

  // Canvas interaction (hit-test, drag, resize, keyboard, hover)
  const interaction = useCanvasInteraction(
    canvasRef,
    overlays,
    selectedId,
    setSelectedId,
    pushState,
    setOverlaysLive,
    snapOverlay,
    setGuides,
    clearGuides,
    deleteOverlay,
    updateOverlay,
    panBackground,
  );

  // Load base image
  const loadBaseImage = useCallback((url: string | undefined) => {
    if (!url) {
      setBaseImage(null);
      if (activeFormat.key !== "original") {
        setCanvasSize({ width: activeFormat.displayWidth, height: activeFormat.displayHeight });
      }
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBaseImage(img);
      if (activeFormat.key === "original") {
        const maxW = 800;
        const scale = Math.min(1, maxW / img.naturalWidth);
        setCanvasSize({
          width: Math.round(img.naturalWidth * scale),
          height: Math.round(img.naturalHeight * scale),
        });
      }
    };
    img.src = url;
  }, [activeFormat]);

  useEffect(() => {
    loadBaseImage(baseImageUrl);
  }, [baseImageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const setBaseImageUrl = useCallback((url: string) => {
    setBaseImageUrlState(url);
  }, []);

  /** Reflow every overlay from one canvas size to another.
   *  Positions move proportionally on each axis; type and object sizes use the
   *  smaller of the two ratios so nothing overflows the new safe area. */
  const reflowOverlays = useCallback(
    (from: { width: number; height: number }, to: { width: number; height: number }) => {
      if (!from.width || !from.height || !to.width || !to.height) return;
      if (from.width === to.width && from.height === to.height) return;
      const kx = to.width / from.width;
      const ky = to.height / from.height;
      const k = Math.min(kx, ky);
      pushState(
        overlays.map((o) => {
          const next: any = { ...o, x: Math.round(o.x * kx), y: Math.round(o.y * ky) };
          if (o.type === "text") {
            next.fontSize = Math.max(1, Math.round(o.fontSize * k));
          } else {
            next.width = Math.round((o as any).width * kx);
            next.height = Math.round((o as any).height * ky);
            if (o.type === "shape" && typeof o.strokeWidth === "number") {
              next.strokeWidth = Math.max(0, o.strokeWidth * k);
            }
          }
          return next as Overlay;
        })
      );
    },
    [overlays, pushState]
  );

  // Set format — the canvas resizes AND the overlays reflow with it, so text
  // authored for one aspect ratio never lands off-canvas in another.
  const setFormat = useCallback((format: CanvasFormat) => {
    setActiveFormat(format);
    const prev = canvasSize;
    let next = prev;
    if (format.key === "original" && baseImage) {
      const maxW = 800;
      const scale = Math.min(1, maxW / baseImage.naturalWidth);
      next = {
        width: Math.round(baseImage.naturalWidth * scale),
        height: Math.round(baseImage.naturalHeight * scale),
      };
    } else if (format.key !== "original") {
      next = { width: format.displayWidth, height: format.displayHeight };
    }
    if (next !== prev) {
      setCanvasSize(next);
      reflowOverlays(prev, next);
    }
  }, [baseImage, canvasSize, reflowOverlays]);


  // Render
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Always fill bg color first (visible when image opacity < 1)
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (baseImage) {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = bgOpacity;
      const { sx, sy, sw, sh } = computeSourceRect(
        baseImage.naturalWidth, baseImage.naturalHeight,
        canvas.width, canvas.height, bgTransform
      );
      ctx.drawImage(baseImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = prevAlpha;
    }

    overlays.forEach((o) => {
      if (o.type === "logo") {
        ctx.drawImage(o.img, o.x, o.y, o.width, o.height);
      } else if (o.type === "shape") {
        drawShape(ctx, o);
      } else {
        const fStyle = o.fontStyle || "normal";
        const fWeight = o.fontWeight || "normal";
        ctx.font = `${fStyle} ${fWeight} ${o.fontSize}px ${o.fontFamily}`;
        ctx.fillStyle = o.color;
        ctx.textBaseline = "top";
        ctx.fillText(o.text, o.x, o.y);
        if (o.textDecoration === "underline") {
          const tw = ctx.measureText(o.text).width;
          ctx.fillRect(o.x, o.y + o.fontSize + 1, tw, Math.max(2, o.fontSize / 14));
        }
      }

      const isSelected = o.id === selectedId;
      const isHovered = o.id === interaction.hoveredId && !isSelected;

      // Hover highlight
      if (isHovered) {
        const bounds = getOverlayBounds(o, ctx);
        ctx.strokeStyle = "rgba(59,130,246,0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(bounds.x - 3, bounds.y - 3, bounds.w + 6, bounds.h + 6);
        ctx.setLineDash([]);
      }

      // Selection with resize handles
      if (isSelected) {
        const bounds = getOverlayBounds(o, ctx);

        // Solid border
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(bounds.x - 2, bounds.y - 2, bounds.w + 4, bounds.h + 4);

        // Resize handles (8 squares)
        const handles = getResizeHandles(bounds);
        handles.forEach((h) => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(h.cx - HANDLE_SIZE / 2, h.cy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(h.cx - HANDLE_SIZE / 2, h.cy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        });

        // Lock indicator
        if (o.locked) {
          ctx.fillStyle = "rgba(239,68,68,0.7)";
          ctx.fillRect(bounds.x - 2, bounds.y - 16, 14, 14);
          ctx.fillStyle = "#fff";
          ctx.font = "10px sans-serif";
          ctx.fillText("🔒", bounds.x - 1, bounds.y - 15);
        }
      }
    });

    // Draw snap guides
    guides.forEach((g) => {
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (g.orientation === "vertical") {
        ctx.moveTo(g.position, 0);
        ctx.lineTo(g.position, canvas.height);
      } else {
        ctx.moveTo(0, g.position);
        ctx.lineTo(canvas.width, g.position);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [overlays, baseImage, selectedId, interaction.hoveredId, guides, activeFormat, bgColor, bgOpacity, bgTransform]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Re-clamp the manual framing whenever the frame or the image changes so a
  // format switch can never reveal empty edges.
  useEffect(() => {
    const t = bgTransformRef.current;
    if (!baseImage) return;
    if (t.zoom === 1 && t.offsetX === 0 && t.offsetY === 0) return;
    const next = clampTransform(t);
    if (next.offsetX !== t.offsetX || next.offsetY !== t.offsetY) {
      bgTransformRef.current = next;
      setBgTransform(next);
    }
  }, [baseImage, canvasSize.width, canvasSize.height, clampTransform]);

  // Add logo from file
  const addLogo = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxDim = 150;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const overlay: LogoOverlay = {
        id: crypto.randomUUID(),
        type: "logo",
        src: url,
        img,
        x: 20,
        y: 20,
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale),
      };
      const next = [...overlays, overlay];
      pushState(next);
      setSelectedId(overlay.id);
    };
    img.src = url;
  }, [overlays, pushState]);

  // Add logo from URL (media library)
  const addLogoFromUrl = useCallback((url: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxDim = 150;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const overlay: LogoOverlay = {
        id: crypto.randomUUID(),
        type: "logo",
        src: url,
        img,
        x: 20,
        y: 20,
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale),
      };
      const next = [...overlays, overlay];
      pushState(next);
      setSelectedId(overlay.id);
    };
    img.src = url;
  }, [overlays, pushState]);

  // Add text
  const addText = useCallback((defaults?: Partial<Omit<TextOverlay, "id" | "type">>) => {
    const overlay: TextOverlay = {
      id: crypto.randomUUID(),
      type: "text",
      text: defaults?.text ?? "Your Text Here",
      x: defaults?.x ?? 20,
      y: defaults?.y ?? 20,
      fontSize: defaults?.fontSize ?? 32,
      color: defaults?.color ?? "#ffffff",
      fontFamily: defaults?.fontFamily ?? "sans-serif",
      fontWeight: defaults?.fontWeight ?? "normal",
      fontStyle: defaults?.fontStyle ?? "normal",
      textDecoration: defaults?.textDecoration ?? "none",
      locked: defaults?.locked,
    };
    const next = [...overlays, overlay];
    pushState(next);
    setSelectedId(overlay.id);
    return overlay.id;
  }, [overlays, pushState]);

  // Add shape
  const addShape = useCallback((shape: ShapeOverlay["shape"]) => {
    const dims: Record<string, { w: number; h: number }> = {
      line: { w: 200, h: 0 },
      arrow: { w: 180, h: 80 },
      star: { w: 120, h: 120 },
      hexagon: { w: 120, h: 110 },
    };
    const d = dims[shape] ?? { w: 120, h: 120 };
    const overlay: ShapeOverlay = {
      id: crypto.randomUUID(),
      type: "shape",
      shape,
      x: 40,
      y: 40,
      width: d.w,
      height: d.h,
      fillColor: shape === "line" ? "" : "rgba(59,130,246,0.5)",
      strokeColor: "#ffffff",
      strokeWidth: 2,
      opacity: 1,
      ...(shape === "rounded-rect" ? { cornerRadius: 12 } : {}),
    };
    const next = [...overlays, overlay];
    pushState(next);
    setSelectedId(overlay.id);
  }, [overlays, pushState]);

  // Apply template (percentage-based positions)
  const applyTemplate = useCallback(
    (texts: Array<Omit<TextOverlay, "id" | "type"> & { xPct?: number; yPct?: number }>) => {
      const newOverlays: TextOverlay[] = texts.map((t) => ({
        id: crypto.randomUUID(),
        type: "text" as const,
        text: t.text,
        x: t.xPct != null ? Math.round(t.xPct * canvasSize.width) : t.x,
        y: t.yPct != null ? Math.round(t.yPct * canvasSize.height) : t.y,
        fontSize: t.fontSize,
        color: t.color,
        fontFamily: t.fontFamily,
        locked: t.locked,
      }));
      pushState(newOverlays);
      if (newOverlays.length > 0) setSelectedId(newOverlays[0].id);
    },
    [pushState, canvasSize]
  );

  /** Hydrate the canvas from a persisted overlay_config. Supports text and
   *  shape overlays directly; logo overlays are re-materialised by loading
   *  the src into an Image before insertion.
   *
   *  Coordinates are normalised to the CURRENT canvas size: overlays that
   *  carry xPct/yPct win, otherwise absolute x/y (and sizes) are rescaled by
   *  the ratio between the config's source canvas and this canvas. Server-
   *  composed assets are authored at full output resolution (e.g. 1080x1350)
   *  while the editor works at its display size, so hydrating raw x/y would
   *  push lower layers off-canvas. */
  const hydrateOverlays = useCallback(
    (serialized: Array<Record<string, any>>, sourceCanvas?: { width?: number; height?: number } | null) => {
      const sw = sourceCanvas?.width && sourceCanvas.width > 0 ? sourceCanvas.width : canvasSize.width;
      const sh = sourceCanvas?.height && sourceCanvas.height > 0 ? sourceCanvas.height : canvasSize.height;
      const kx = canvasSize.width / sw;
      const ky = canvasSize.height / sh;
      const k = Math.min(kx, ky);

      const norm = (raw: Record<string, any>) => {
        const out: Record<string, any> = { ...raw };
        out.x = raw.xPct != null ? Math.round(raw.xPct * canvasSize.width) : Math.round((raw.x ?? 0) * kx);
        out.y = raw.yPct != null ? Math.round(raw.yPct * canvasSize.height) : Math.round((raw.y ?? 0) * ky);
        if (typeof raw.fontSize === "number") out.fontSize = Math.max(1, Math.round(raw.fontSize * k));
        if (typeof raw.width === "number") out.width = Math.round(raw.width * kx);
        if (typeof raw.height === "number") out.height = Math.round(raw.height * ky);
        return out;
      };

      const rebuilt: Overlay[] = [];
      const pending: Array<Promise<Overlay | null>> = [];

      for (const raw of serialized) {
        if (raw?.type === "text") {
          rebuilt.push({ ...(norm(raw) as any), id: raw.id ?? crypto.randomUUID(), type: "text" });
        } else if (raw?.type === "shape") {
          rebuilt.push({ ...(norm(raw) as any), id: raw.id ?? crypto.randomUUID(), type: "shape" });
        } else if (raw?.type === "logo" && raw.src) {
          const n = norm(raw);
          pending.push(
            new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve({ ...(n as any), id: raw.id ?? crypto.randomUUID(), type: "logo", img } as LogoOverlay);
              img.onerror = () => resolve(null);
              img.src = raw.src;
            })
          );
        }
      }

      if (pending.length === 0) {
        pushState(rebuilt);
        return;
      }
      // Push text/shapes immediately, add logos when their images resolve
      pushState(rebuilt);
      Promise.all(pending).then((logos) => {
        const good = logos.filter((l): l is Overlay => !!l);
        if (good.length) pushState([...rebuilt, ...good]);
      });
    },
    [pushState, canvasSize]
  );



  // Reorder overlay (z-order)
  const reorderOverlay = useCallback(
    (id: string, direction: "up" | "down" | "front" | "back") => {
      const idx = overlays.findIndex((o) => o.id === id);
      if (idx === -1) return;
      const next = [...overlays];
      const [item] = next.splice(idx, 1);
      switch (direction) {
        case "up":
          next.splice(Math.min(idx + 1, next.length), 0, item);
          break;
        case "down":
          next.splice(Math.max(idx - 1, 0), 0, item);
          break;
        case "front":
          next.push(item);
          break;
        case "back":
          next.unshift(item);
          break;
      }
      pushState(next);
    },
    [overlays, pushState]
  );

  // Export
  const exportCanvas = useCallback(async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");

    let exportW: number;
    let exportH: number;

    if (activeFormat.key !== "original") {
      exportW = activeFormat.exportWidth;
      exportH = activeFormat.exportHeight;
    } else if (baseImage) {
      exportW = baseImage.naturalWidth;
      exportH = baseImage.naturalHeight;
    } else {
      exportW = canvasSize.width;
      exportH = canvasSize.height;
    }

    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = exportW / canvasSize.width;
    const scaleY = exportH / canvasSize.height;

    // Always fill bg color first
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, exportW, exportH);

    if (baseImage) {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = bgOpacity;
      const { sx, sy, sw, sh } = computeSourceRect(
        baseImage.naturalWidth, baseImage.naturalHeight, exportW, exportH, bgTransform
      );
      ctx.drawImage(baseImage, sx, sy, sw, sh, 0, 0, exportW, exportH);
      ctx.globalAlpha = prevAlpha;
    }

    overlays.forEach((o) => {
      if (o.type === "logo") {
        ctx.drawImage(o.img, o.x * scaleX, o.y * scaleY, o.width * scaleX, o.height * scaleY);
      } else if (o.type === "shape") {
        drawShape(ctx, o, scaleX, scaleY);
      } else {
        const fStyle = o.fontStyle || "normal";
        const fWeight = o.fontWeight || "normal";
        ctx.font = `${fStyle} ${fWeight} ${o.fontSize * scaleX}px ${o.fontFamily}`;
        ctx.fillStyle = o.color;
        ctx.textBaseline = "top";
        ctx.fillText(o.text, o.x * scaleX, o.y * scaleY);
        if (o.textDecoration === "underline") {
          const tw = ctx.measureText(o.text).width;
          ctx.fillRect(o.x * scaleX, o.y * scaleY + o.fontSize * scaleX + 1, tw, Math.max(2, (o.fontSize * scaleX) / 14));
        }
      }
    });

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  }, [baseImage, overlays, canvasSize, activeFormat, bgColor, bgOpacity, bgTransform]);

  const selectedOverlay = overlays.find((o) => o.id === selectedId) ?? null;

  return {
    canvasRef,
    canvasSize,
    overlays,
    selectedId,
    selectedOverlay,
    addLogo,
    addLogoFromUrl,
    addText,
    addShape,
    applyTemplate,
    hydrateOverlays,
    updateOverlay,
    deleteOverlay,
    reorderOverlay,
    onMouseDown: interaction.onMouseDown,
    onMouseMove: interaction.onMouseMove,
    onMouseUp: interaction.onMouseUp,
    onTouchStart: interaction.onTouchStart,
    onTouchMove: interaction.onTouchMove,
    onTouchEnd: interaction.onTouchEnd,
    onKeyDown: interaction.onKeyDown,
    exportCanvas,
    setSelectedId,
    undo,
    redo,
    canUndo,
    canRedo,
    guides,
    activeFormat,
    setFormat,
    bgColor,
    setBgColor,
    bgOpacity,
    setBgOpacity,
    bgTransform,
    bgZoom: bgTransform.zoom,
    setBgZoom,
    panBackground,
    zoomBackgroundAt,
    resetBackgroundTransform,
    applyBgTransform,
    cursorStyle: interaction.cursorStyle,
    setBaseImageUrl,
    baseImageUrl,
  };
}
