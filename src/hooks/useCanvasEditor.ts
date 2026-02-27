import { useState, useRef, useCallback, useEffect } from "react";
import { useCanvasHistory } from "./canvas/useCanvasHistory";
import { useCanvasSnap } from "./canvas/useCanvasSnap";
import type { Overlay, LogoOverlay, TextOverlay, SnapGuide } from "./canvas/canvasTypes";

export type { Overlay, LogoOverlay, TextOverlay, SnapGuide };

type DragState = {
  overlayId: string;
  offsetX: number;
  offsetY: number;
} | null;

export function useCanvasEditor(baseImageUrl: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { overlays, pushState, setOverlaysLive, undo, redo, canUndo, canRedo } = useCanvasHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const dragRef = useRef<DragState>(null);
  const { guides, setGuides, snapOverlay, clearGuides } = useCanvasSnap(canvasSize.width, canvasSize.height);

  // Load base image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBaseImage(img);
      const maxW = 800;
      const scale = Math.min(1, maxW / img.naturalWidth);
      setCanvasSize({
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale),
      });
    };
    img.src = baseImageUrl;
  }, [baseImageUrl]);

  // Render
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !baseImage) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

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
  }, [overlays, baseImage, selectedId, guides]);

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
      // Commit to history on drop
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

  // Apply template
  const applyTemplate = useCallback(
    (texts: Array<Omit<TextOverlay, "id" | "type">>) => {
      const newOverlays: TextOverlay[] = texts.map((t) => ({
        id: crypto.randomUUID(),
        type: "text" as const,
        ...t,
      }));
      pushState(newOverlays);
      if (newOverlays.length > 0) setSelectedId(newOverlays[0].id);
    },
    [pushState]
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
    if (!baseImage) return null;
    canvas.width = baseImage.naturalWidth;
    canvas.height = baseImage.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = baseImage.naturalWidth / canvasSize.width;
    const scaleY = baseImage.naturalHeight / canvasSize.height;

    ctx.drawImage(baseImage, 0, 0);
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
  }, [baseImage, overlays, canvasSize]);

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
  };
}
