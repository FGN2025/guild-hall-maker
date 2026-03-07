import { useRef, useState } from "react";
import { useCanvasEditor, TextOverlay, CANVAS_FORMATS, CanvasFormat } from "@/hooks/useCanvasEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ImagePlus, Type, Trash2, Download, Save, ExternalLink, LayoutTemplate, Undo2, Redo2, Layers, Square, RectangleHorizontal, RectangleVertical, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TemplateText = {
  text: string;
  xPct: number;
  yPct: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  // Legacy absolute fields needed by Omit<TextOverlay, "id" | "type"> shape
  x: number;
  y: number;
};

type OverlayTemplate = {
  name: string;
  description: string;
  texts: TemplateText[];
};

const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  {
    name: "Event Banner",
    description: "Title + date + tagline layout",
    texts: [
      { text: "EVENT NAME", xPct: 0.05, yPct: 0.07, x: 40, y: 40, fontSize: 48, color: "#ffffff", fontFamily: "sans-serif" },
      { text: "March 15, 2026", xPct: 0.05, yPct: 0.17, x: 40, y: 100, fontSize: 24, color: "#cccccc", fontFamily: "sans-serif" },
      { text: "Register Now!", xPct: 0.05, yPct: 0.23, x: 40, y: 140, fontSize: 20, color: "#00ff88", fontFamily: "sans-serif" },
    ],
  },
  {
    name: "Tournament Promo",
    description: "Prize pool + game + CTA",
    texts: [
      { text: "TOURNAMENT", xPct: 0.05, yPct: 0.05, x: 40, y: 30, fontSize: 52, color: "#ffffff", fontFamily: "sans-serif" },
      { text: "$500 Prize Pool", xPct: 0.05, yPct: 0.16, x: 40, y: 95, fontSize: 28, color: "#ffd700", fontFamily: "sans-serif" },
      { text: "Game Title Here", xPct: 0.05, yPct: 0.23, x: 40, y: 135, fontSize: 22, color: "#aaaaaa", fontFamily: "sans-serif" },
      { text: "SIGN UP TODAY", xPct: 0.05, yPct: 0.30, x: 40, y: 180, fontSize: 20, color: "#00ccff", fontFamily: "sans-serif" },
    ],
  },
  {
    name: "Social Media Post",
    description: "Headline + subtitle centered",
    texts: [
      { text: "YOUR HEADLINE", xPct: 0.25, yPct: 0.25, x: 200, y: 150, fontSize: 44, color: "#ffffff", fontFamily: "sans-serif" },
      { text: "Add your message here", xPct: 0.28, yPct: 0.35, x: 220, y: 210, fontSize: 22, color: "#dddddd", fontFamily: "sans-serif" },
    ],
  },
  {
    name: "Branded Corner",
    description: "Organization name in bottom-right",
    texts: [
      { text: "YOUR ORG NAME", xPct: 0.63, yPct: 0.87, x: 500, y: 520, fontSize: 24, color: "#ffffff", fontFamily: "sans-serif" },
      { text: "Powered by FGN", xPct: 0.66, yPct: 0.93, x: 530, y: 555, fontSize: 14, color: "#999999", fontFamily: "sans-serif" },
    ],
  },
  {
    name: "Winner Announcement",
    description: "Congrats + winner name",
    texts: [
      { text: "🏆 CONGRATULATIONS", xPct: 0.19, yPct: 0.13, x: 150, y: 80, fontSize: 42, color: "#ffd700", fontFamily: "sans-serif" },
      { text: "Player Name", xPct: 0.31, yPct: 0.23, x: 250, y: 140, fontSize: 36, color: "#ffffff", fontFamily: "sans-serif" },
      { text: "Tournament Champion", xPct: 0.28, yPct: 0.32, x: 220, y: 190, fontSize: 22, color: "#cccccc", fontFamily: "sans-serif" },
    ],
  },
];

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  original: <RectangleHorizontal className="h-4 w-4" />,
  square: <Square className="h-4 w-4" />,
  landscape: <RectangleHorizontal className="h-4 w-4" />,
  portrait: <RectangleVertical className="h-4 w-4" />,
  story: <Smartphone className="h-4 w-4" />,
};

interface AssetEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseImageUrl?: string;
  onSave: (blob: Blob) => Promise<void>;
  initialTexts?: Array<Omit<TextOverlay, "id" | "type"> & { xPct?: number; yPct?: number }>;
}

const AssetEditorDialog = ({ open, onOpenChange, baseImageUrl, onSave, initialTexts }: AssetEditorDialogProps) => {
  const {
    canvasRef,
    canvasSize,
    overlays,
    selectedId,
    selectedOverlay,
    setSelectedId,
    addLogo,
    addText,
    applyTemplate,
    updateOverlay,
    deleteOverlay,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    exportCanvas,
    undo,
    redo,
    canUndo,
    canRedo,
    activeFormat,
    setFormat,
    bgColor,
    setBgColor,
  } = useCanvasEditor(baseImageUrl);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addLogo(file);
    if (e.target) e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const blob = await exportCanvas();
      if (!blob) { toast.error("Export failed"); return; }
      await onSave(blob);
      toast.success("Asset saved");
      onOpenChange(false);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    const blob = await exportCanvas();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const formatLabel = activeFormat.key !== "original"
      ? `${activeFormat.key}-${activeFormat.exportWidth}x${activeFormat.exportHeight}`
      : "original";
    a.download = `asset-${formatLabel}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Asset Editor</DialogTitle>
        </DialogHeader>

        {/* Format Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground mr-1">Format:</span>
          {CANVAS_FORMATS.map((fmt) => (
            <Button
              key={fmt.key}
              size="sm"
              variant={activeFormat.key === fmt.key ? "default" : "outline"}
              className="gap-1.5 text-xs"
              onClick={() => setFormat(fmt)}
            >
              {FORMAT_ICONS[fmt.key]}
              {fmt.label}
              {fmt.key !== "original" && (
                <span className="text-[10px] opacity-60">{fmt.exportWidth}×{fmt.exportHeight}</span>
              )}
            </Button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Canvas */}
          <div className="flex-1 border border-border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="cursor-crosshair max-w-full"
              style={{ maxHeight: "60vh" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            />
          </div>

          {/* Toolbar */}
          <div className="w-full lg:w-64 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={undo} disabled={!canUndo} title="Undo">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={redo} disabled={!canRedo} title="Redo">
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-1" /> Logo
              </Button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button size="sm" variant="outline" onClick={() => addText()}>
                <Type className="h-4 w-4 mr-1" /> Text
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <LayoutTemplate className="h-4 w-4 mr-1" /> Templates
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <p className="text-xs font-heading uppercase tracking-wider text-muted-foreground px-2 pb-2">Quick Templates</p>
                  <div className="space-y-1">
                    {OVERLAY_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.name}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                        onClick={() => applyTemplate(tpl.texts)}
                      >
                        <span className="text-sm font-medium text-foreground">{tpl.name}</span>
                        <span className="block text-xs text-muted-foreground">{tpl.description}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Background Color (shown when no base image) */}
            {!baseImageUrl && (
              <div className="p-3 border border-border rounded-lg bg-card space-y-2">
                <Label className="text-xs font-heading uppercase tracking-wider text-muted-foreground">Canvas Background</Label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-8 rounded border border-input cursor-pointer"
                />
              </div>
            )}

            {/* Layers Panel */}
            {overlays.length > 0 && (
              <div className="space-y-1 p-3 border border-border rounded-lg bg-card">
                <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Layers
                </span>
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {overlays.map((o) => (
                    <button
                      key={o.id}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors group ${
                        o.id === selectedId
                          ? "bg-accent ring-2 ring-primary"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => setSelectedId(o.id)}
                    >
                      {o.type === "logo" ? (
                        <ImagePlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Type className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate flex-1 text-foreground">
                        {o.type === "logo" ? "Logo" : (o.text.length > 18 ? o.text.slice(0, 18) + "…" : o.text)}
                      </span>
                      <button
                        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-destructive hover:text-destructive/80"
                        onClick={(e) => { e.stopPropagation(); deleteOverlay(o.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected overlay controls */}
            {selectedOverlay && (
              <div className="space-y-3 p-3 border border-border rounded-lg bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
                    {selectedOverlay.type === "logo" ? "Logo" : "Text"} Properties
                  </span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteOverlay(selectedOverlay.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {selectedOverlay.type === "text" && (
                  <>
                    <div>
                      <Label className="text-xs">Text</Label>
                      <Input
                        value={selectedOverlay.text}
                        onChange={(e) => updateOverlay(selectedOverlay.id, { text: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Font Size: {selectedOverlay.fontSize}px</Label>
                      <Slider
                        value={[selectedOverlay.fontSize]}
                        onValueChange={([v]) => updateOverlay(selectedOverlay.id, { fontSize: v })}
                        min={12}
                        max={120}
                        step={1}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <input
                        type="color"
                        value={selectedOverlay.color}
                        onChange={(e) => updateOverlay(selectedOverlay.id, { color: e.target.value })}
                        className="w-full h-8 rounded border border-input cursor-pointer"
                      />
                    </div>
                  </>
                )}

                {selectedOverlay.type === "logo" && (
                  <div>
                    <Label className="text-xs">Size: {selectedOverlay.width}px</Label>
                    <Slider
                      value={[selectedOverlay.width]}
                      onValueChange={([v]) => {
                        const ratio = selectedOverlay.height / selectedOverlay.width;
                        updateOverlay(selectedOverlay.id, { width: v, height: Math.round(v * ratio) });
                      }}
                      min={20}
                      max={500}
                      step={1}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Canva placeholder */}
            <Button size="sm" variant="ghost" className="w-full text-muted-foreground" disabled>
              <ExternalLink className="h-4 w-4 mr-1" /> Open in Canva — Coming Soon
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save as New Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssetEditorDialog;
