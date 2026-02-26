import { useState, useRef, useCallback, useEffect } from "react";

export type LogoOverlay = {
  id: string;
  type: "logo";
  src: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextOverlay = {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
};

export type Overlay = LogoOverlay | TextOverlay;

type DragState = {
  overlayId: string;
  offsetX: number;
  offsetY: number;
} | null;

export function useCanvasEditor(baseImageUrl: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const dragRef = useRef<DragState>(null);

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

      // Selection outline
      if (o.id === selectedId) {
        ctx.strokeStyle = "hsl(var(--primary))";
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
  }, [overlays, baseImage, selectedId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Hit test
  const hitTest = useCallback(
    (mx: number, my: number): Overlay | null => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      // Reverse order so top-most is hit first
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
      setOverlays((prev) =>
        prev.map((o) => (o.id === overlayId ? { ...o, x: mx - offsetX, y: my - offsetY } : o))
      );
    },
    []
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

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
      setOverlays((prev) => [...prev, overlay]);
      setSelectedId(overlay.id);
    };
    img.src = url;
  }, []);

  // Add text
  const addText = useCallback(() => {
    const overlay: TextOverlay = {
      id: crypto.randomUUID(),
      type: "text",
      text: "Your Text Here",
      x: 20,
      y: 20,
      fontSize: 32,
      color: "#ffffff",
      fontFamily: "sans-serif",
    };
    setOverlays((prev) => [...prev, overlay]);
    setSelectedId(overlay.id);
  }, []);

  // Update overlay
  const updateOverlay = useCallback((id: string, updates: Record<string, unknown>) => {
    setOverlays((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        if (o.type === "logo") return { ...o, ...updates } as LogoOverlay;
        return { ...o, ...updates } as TextOverlay;
      })
    );
  }, []);

  // Delete overlay
  const deleteOverlay = useCallback(
    (id: string) => {
      setOverlays((prev) => prev.filter((o) => o.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId]
  );

  // Export
  const exportCanvas = useCallback(async (): Promise<Blob | null> => {
    // Render at full resolution for export
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
    updateOverlay,
    deleteOverlay,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    exportCanvas,
    setSelectedId,
  };
}
