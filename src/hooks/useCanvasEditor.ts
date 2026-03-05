import { useState, useRef, useCallback, useEffect } from "react";
import { useCanvasHistory } from "./canvas/useCanvasHistory";
import { useCanvasSnap } from "./canvas/useCanvasSnap";
import type { Overlay, LogoOverlay, TextOverlay, SnapGuide, CanvasFormat } from "./canvas/canvasTypes";
import { CANVAS_FORMATS } from "./canvas/canvasTypes";

export type { Overlay, LogoOverlay, TextOverlay, SnapGuide, CanvasFormat };
export { CANVAS_FORMATS };

type DragState = {
  overlayId: string;
  offsetX: number;
  offsetY: number;
} | null;

/** Compute center-crop source rect from image into target aspect ratio */
function centerCropRect(
  imgW: number, imgH: number, targetW: number, targetH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const targetAspect = targetW / targetH;
  const imgAspect = imgW / imgH;
  let sw: number, sh: number, sx: number, sy: number;
  if (imgAspect > targetAspect) {
    // image is wider — crop sides
    sh = imgH;
    sw = imgH * targetAspect;
    sx = (imgW - sw) / 2;
    sy = 0;
  } else {
    // image is taller — crop top/bottom
    sw = imgW;
    sh = imgW / targetAspect;
    sx = 0;
    sy = (imgH - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

export function useCanvasEditor(baseImageUrl?: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { overlays, pushState, setOverlaysLive, undo, redo, canUndo, canRedo } = useCanvasHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [activeFormat, setActiveFormat] = useState<CanvasFormat>(CANVAS_FORMATS[0]); // Original
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const dragRef = useRef<DragState>(null);
  const { guides, setGuides, snapOverlay, clearGuides } = useCanvasSnap(canvasSize.width, canvasSize.height);

  // Load base image
  useEffect(() => {
    if (!baseImageUrl) {
      setBaseImage(null);
      // Use format dimensions or default
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
    img.src = baseImageUrl;
  }, [baseImageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

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

    if (baseImage) {
      if (activeFormat.key !== "original") {
        // Center-crop the image into the format
        const { sx, sy, sw, sh } = centerCropRect(
          baseImage.naturalWidth, baseImage.naturalHeight,
          canvas.width, canvas.height
        );
        ctx.drawImage(baseImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      }
    } else {
      // Blank canvas — fill with bgColor
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    overlays.forEach((o) => {
      if (o.type === "logo") {
        ctx.drawImage(o.img, o.x, o.y, o.width, o.height);
      } else {
        ctx.font = `${o.fontSize}px ${o.fontFamily}`;
        ctx.fillStyle = o.color;
        ctx.textBaseline = "top";
        ctx.fillText(o.text, o.x, o.y);
      }

      if (o.id === selectedId) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        if (o.type === "logo") {
          ctx.strokeRect(o.x - 2, o.y - 2, o.width + 4, o.height + 4);
        } else {
          const metrics = ctx.measureText(o.text);
          ctx.strokeRect(o.x - 2, o.y - 2, metrics.width + 4, o.fontSize + 4);
        }
        ctx.setLineDash([]);
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
  }, [overlays, baseImage, selectedId, guides, activeFormat, bgColor]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Hit test
  const hitTest = useCallback(
    (mx: number, my: number): Overlay | null => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      for (let i = overlays.length - 1; i >= 0; i--) {
        const o = overlays[i];
        if (o.type === "logo") {
          if (mx >= o.x && mx <= o.x + o.width && my >= o.y && my <= o.y + o.height) return o;
        } else if (ctx) {
          ctx.font = `${o.fontSize}px ${o.fontFamily}`;
          const w = ctx.measureText(o.text).width;
          if (mx >= o.x && mx <= o.x + w && my >= o.y && my <= o.y + o.fontSize) return o;
        }
      }
      return null;
    },
    [overlays]
  );

  // Mouse handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitTest(mx, my);
      if (hit) {
        setSelectedId(hit.id);
        dragRef.current = { overlayId: hit.id, offsetX: mx - hit.x, offsetY: my - hit.y };
      } else {
        setSelectedId(null);
      }
    },
    [hitTest]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { overlayId, offsetX, offsetY } = dragRef.current;

      setOverlaysLive((prev) => {
        const idx = prev.findIndex((o) => o.id === overlayId);
        if (idx === -1) return prev;
        const dragged = { ...prev[idx], x: mx - offsetX, y: my - offsetY };
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
    [snapOverlay, setGuides, setOverlaysLive]
  );

  const onMouseUp = useCallback(() => {
    if (dragRef.current) {
      pushState(overlays);
      clearGuides();
    }
    dragRef.current = null;
  }, [overlays, pushState, clearGuides]);

  // Add logo
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
    };
    const next = [...overlays, overlay];
    pushState(next);
    setSelectedId(overlay.id);
    return overlay.id;
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
      }));
      pushState(newOverlays);
      if (newOverlays.length > 0) setSelectedId(newOverlays[0].id);
    },
    [pushState, canvasSize]
  );

  // Update overlay
  const updateOverlay = useCallback((id: string, updates: Record<string, unknown>) => {
    const next = overlays.map((o) => {
      if (o.id !== id) return o;
      if (o.type === "logo") return { ...o, ...updates } as LogoOverlay;
      return { ...o, ...updates } as TextOverlay;
    });
    pushState(next);
  }, [overlays, pushState]);

  // Delete overlay
  const deleteOverlay = useCallback(
    (id: string) => {
      pushState(overlays.filter((o) => o.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [overlays, selectedId, pushState]
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
    addText,
    applyTemplate,
    updateOverlay,
    deleteOverlay,
    onMouseDown,
    onMouseMove,
    onMouseUp,
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
  };
}
