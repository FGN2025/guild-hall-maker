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
  const [baseImageUrl, setBaseImageUrlState] = useState(initialBaseImageUrl);
  const { guides, setGuides, snapOverlay, clearGuides } = useCanvasSnap(canvasSize.width, canvasSize.height);

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

  // Set format
  const setFormat = useCallback((format: CanvasFormat) => {
    setActiveFormat(format);
    if (format.key === "original" && baseImage) {
      const maxW = 800;
      const scale = Math.min(1, maxW / baseImage.naturalWidth);
      setCanvasSize({
        width: Math.round(baseImage.naturalWidth * scale),
        height: Math.round(baseImage.naturalHeight * scale),
      });
    } else if (format.key !== "original") {
      setCanvasSize({ width: format.displayWidth, height: format.displayHeight });
    }
  }, [baseImage]);

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
      if (activeFormat.key !== "original") {
        const { sx, sy, sw, sh } = centerCropRect(
          baseImage.naturalWidth, baseImage.naturalHeight,
          canvas.width, canvas.height
        );
        ctx.drawImage(baseImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      }
      ctx.globalAlpha = prevAlpha;
    }

    overlays.forEach((o) => {
      if (o.type === "logo") {
        ctx.drawImage(o.img, o.x, o.y, o.width, o.height);
      } else if (o.type === "shape") {
        drawShape(ctx, o);
      } else {
        ctx.font = `${o.fontSize}px ${o.fontFamily}`;
        ctx.fillStyle = o.color;
        ctx.textBaseline = "top";
        ctx.fillText(o.text, o.x, o.y);
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
  }, [overlays, baseImage, selectedId, interaction.hoveredId, guides, activeFormat, bgColor]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

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
      locked: defaults?.locked,
    };
    const next = [...overlays, overlay];
    pushState(next);
    setSelectedId(overlay.id);
    return overlay.id;
  }, [overlays, pushState]);

  // Add shape
  const addShape = useCallback((shape: "rect" | "circle" | "line") => {
    const overlay: ShapeOverlay = {
      id: crypto.randomUUID(),
      type: "shape",
      shape,
      x: 40,
      y: 40,
      width: shape === "line" ? 200 : 120,
      height: shape === "line" ? 0 : 120,
      fillColor: shape === "line" ? "" : "rgba(59,130,246,0.5)",
      strokeColor: "#ffffff",
      strokeWidth: 2,
      opacity: 1,
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

    if (baseImage) {
      if (activeFormat.key !== "original") {
        const { sx, sy, sw, sh } = centerCropRect(
          baseImage.naturalWidth, baseImage.naturalHeight, exportW, exportH
        );
        ctx.drawImage(baseImage, sx, sy, sw, sh, 0, 0, exportW, exportH);
      } else {
        ctx.drawImage(baseImage, 0, 0, exportW, exportH);
      }
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, exportW, exportH);
    }

    overlays.forEach((o) => {
      if (o.type === "logo") {
        ctx.drawImage(o.img, o.x * scaleX, o.y * scaleY, o.width * scaleX, o.height * scaleY);
      } else if (o.type === "shape") {
        drawShape(ctx, o, scaleX, scaleY);
      } else {
        ctx.font = `${o.fontSize * scaleX}px ${o.fontFamily}`;
        ctx.fillStyle = o.color;
        ctx.textBaseline = "top";
        ctx.fillText(o.text, o.x * scaleX, o.y * scaleY);
      }
    });

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  }, [baseImage, overlays, canvasSize, activeFormat, bgColor]);

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
    cursorStyle: interaction.cursorStyle,
    setBaseImageUrl,
    baseImageUrl,
  };
}
