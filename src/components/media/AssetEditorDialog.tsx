import { useRef, useState, useEffect } from "react";
import { useCanvasEditor, TextOverlay, ShapeOverlay, CANVAS_FORMATS, CanvasFormat } from "@/hooks/useCanvasEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ImagePlus, Type, Trash2, Download, Save, ExternalLink,
  LayoutTemplate, Undo2, Redo2, Layers, Square, RectangleHorizontal,
  RectangleVertical, Smartphone, Circle, Minus, ChevronUp, ChevronDown,
  Lock, Unlock, Library, ChevronsUp, ChevronsDown, ImageIcon,
  Send, CalendarClock, Facebook, Instagram, Twitter, Linkedin, Clock,
  Bold, Italic, Underline, Triangle, Diamond, Star, ArrowRight, Hexagon, SquareRoundCorner,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import TemplateGalleryPanel from "./TemplateGalleryPanel";
import MediaPickerDialog from "./MediaPickerDialog";
import { FORMAT_PLATFORM_MAP, PLATFORM_LABELS, PLATFORM_COLORS } from "@/hooks/canvas/canvasTypes";
import { useSocialConnections, SocialConnection } from "@/hooks/useSocialConnections";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { Calendar } from "@/components/ui/calendar";
import { Popover as UiPopover, PopoverContent as UiPopoverContent, PopoverTrigger as UiPopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const FONT_OPTIONS = [
  { value: "sans-serif", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "'Arial Black', sans-serif", label: "Arial Black" },
];

const PLATFORM_ICONS_SM: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
};

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
    addLogoFromUrl,
    addText,
    addShape,
    applyTemplate,
    updateOverlay,
    deleteOverlay,
    reorderOverlay,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onKeyDown,
    exportCanvas,
    undo,
    redo,
    canUndo,
    canRedo,
    activeFormat,
    setFormat,
    bgColor,
    setBgColor,
    bgOpacity,
    setBgOpacity,
    cursorStyle,
    setBaseImageUrl,
    baseImageUrl: currentBaseImageUrl,
  } = useCanvasEditor(baseImageUrl);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const appliedInitialRef = useRef(false);

  // Social publishing state
  const { connections } = useSocialConnections();
  const { schedulePost } = useScheduledPosts();
  const [publishCaption, setPublishCaption] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduleConnection, setScheduleConnection] = useState<SocialConnection | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Get compatible platforms for current format
  const compatiblePlatforms = FORMAT_PLATFORM_MAP[activeFormat.key] || FORMAT_PLATFORM_MAP.original;
  const compatibleConnections = connections.filter(
    (c) => compatiblePlatforms.includes(c.platform)
  );

  useEffect(() => {
    if (initialTexts && initialTexts.length > 0 && !appliedInitialRef.current && canvasSize.width > 0) {
      appliedInitialRef.current = true;
      applyTemplate(initialTexts);
    }
  }, [initialTexts, canvasSize.width, applyTemplate]);

  useEffect(() => {
    if (!open) appliedInitialRef.current = false;
  }, [open]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addLogo(file);
    if (e.target) e.target.value = "";
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBaseImageUrl(url);
    }
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

  const getOverlayLabel = (o: typeof overlays[number]) => {
    if (o.type === "logo") return "Logo";
    if (o.type === "shape") return o.shape.charAt(0).toUpperCase() + o.shape.slice(1);
    const txt = o.text;
    return txt.length > 16 ? txt.slice(0, 16) + "…" : txt;
  };

  const getOverlayIcon = (o: typeof overlays[number]) => {
    if (o.type === "logo") return <ImagePlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
    if (o.type === "shape") {
      if (o.shape === "circle") return <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
      if (o.shape === "line") return <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
      return <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
    }
    return <Type className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
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
              tabIndex={0}
              className="max-w-full outline-none"
              style={{ maxHeight: "60vh", cursor: cursorStyle }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onKeyDown={onKeyDown}
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
              <Button size="sm" variant="outline" onClick={() => setMediaPickerOpen(true)}>
                <Library className="h-4 w-4 mr-1" /> Library
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" title="Change background image">
                    <ImageIcon className="h-4 w-4 mr-1" /> Background
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => bgInputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4 mr-2" /> Upload File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBgPickerOpen(true)}>
                    <Library className="h-4 w-4 mr-2" /> From Library
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
              <Button size="sm" variant="outline" onClick={() => addText()}>
                <Type className="h-4 w-4 mr-1" /> Text
              </Button>

              {/* Shape dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Square className="h-4 w-4 mr-1" /> Shape
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => addShape("rect")}>
                    <Square className="h-4 w-4 mr-2" /> Rectangle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addShape("circle")}>
                    <Circle className="h-4 w-4 mr-2" /> Circle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addShape("line")}>
                    <Minus className="h-4 w-4 mr-2" /> Line
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Templates */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <LayoutTemplate className="h-4 w-4 mr-1" /> Templates
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <TemplateGalleryPanel
                    canvasWidth={canvasSize.width}
                    canvasHeight={canvasSize.height}
                    onApply={applyTemplate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Background Settings */}
            <div className="p-3 border border-border rounded-lg bg-card space-y-2">
              <Label className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
                {currentBaseImageUrl ? "Background" : "Canvas Background"}
              </Label>
              {!currentBaseImageUrl && (
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-8 rounded border border-input cursor-pointer"
                />
              )}
              {currentBaseImageUrl && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Opacity</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{Math.round(bgOpacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[Math.round(bgOpacity * 100)]}
                    onValueChange={([v]) => setBgOpacity(v / 100)}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Tint</span>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-6 h-6 rounded border border-input cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Layers Panel */}
            {overlays.length > 0 && (
              <div className="space-y-1 p-3 border border-border rounded-lg bg-card">
                <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Layers
                </span>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {[...overlays].reverse().map((o, revIdx) => {
                    const realIdx = overlays.length - 1 - revIdx;
                    return (
                      <div
                        key={o.id}
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors group ${
                          o.id === selectedId
                            ? "bg-accent ring-2 ring-primary"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <button className="flex items-center gap-1.5 flex-1 min-w-0 text-left" onClick={() => setSelectedId(o.id)}>
                          {getOverlayIcon(o)}
                          <span className="text-sm truncate flex-1 text-foreground">
                            {getOverlayLabel(o)}
                          </span>
                        </button>

                        {/* Lock toggle */}
                        <button
                          className="h-5 w-5 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => updateOverlay(o.id, { locked: !o.locked })}
                          title={o.locked ? "Unlock" : "Lock"}
                        >
                          {o.locked ? <Lock className="h-3 w-3 text-destructive" /> : <Unlock className="h-3 w-3" />}
                        </button>

                        {/* Z-order controls */}
                        <div className="flex flex-col shrink-0">
                          <button
                            className="h-3.5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() => reorderOverlay(o.id, "up")}
                            disabled={realIdx === overlays.length - 1}
                            title="Bring Forward"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            className="h-3.5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() => reorderOverlay(o.id, "down")}
                            disabled={realIdx === 0}
                            title="Send Backward"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Bring to front / send to back */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-muted-foreground hover:text-foreground">
                              <Layers className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[140px]">
                            <DropdownMenuItem onClick={() => reorderOverlay(o.id, "front")} disabled={realIdx === overlays.length - 1}>
                              <ChevronsUp className="h-3.5 w-3.5 mr-2" /> Bring to Front
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => reorderOverlay(o.id, "back")} disabled={realIdx === 0}>
                              <ChevronsDown className="h-3.5 w-3.5 mr-2" /> Send to Back
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Delete */}
                        <button
                          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-destructive hover:text-destructive/80"
                          onClick={(e) => { e.stopPropagation(); deleteOverlay(o.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected overlay controls */}
            {selectedOverlay && (
              <div className="space-y-3 p-3 border border-border rounded-lg bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
                    {selectedOverlay.type === "logo" ? "Logo" : selectedOverlay.type === "shape" ? "Shape" : "Text"} Properties
                  </span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteOverlay(selectedOverlay.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {selectedOverlay.locked && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Locked — position fixed
                  </p>
                )}

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
                      <Label className="text-xs">Font Family</Label>
                      <Select
                        value={selectedOverlay.fontFamily}
                        onValueChange={(v) => updateOverlay(selectedOverlay.id, { fontFamily: v })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((f) => (
                            <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Toggle
                        size="sm"
                        pressed={selectedOverlay.fontWeight === "bold"}
                        onPressedChange={(p) => updateOverlay(selectedOverlay.id, { fontWeight: p ? "bold" : "normal" })}
                        aria-label="Bold"
                      >
                        <Bold className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={selectedOverlay.fontStyle === "italic"}
                        onPressedChange={(p) => updateOverlay(selectedOverlay.id, { fontStyle: p ? "italic" : "normal" })}
                        aria-label="Italic"
                      >
                        <Italic className="h-4 w-4" />
                      </Toggle>
                      <Toggle
                        size="sm"
                        pressed={selectedOverlay.textDecoration === "underline"}
                        onPressedChange={(p) => updateOverlay(selectedOverlay.id, { textDecoration: p ? "underline" : "none" })}
                        aria-label="Underline"
                      >
                        <Underline className="h-4 w-4" />
                      </Toggle>
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

                {selectedOverlay.type === "shape" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Width: {selectedOverlay.width}</Label>
                        <Slider
                          value={[selectedOverlay.width]}
                          onValueChange={([v]) => updateOverlay(selectedOverlay.id, { width: v })}
                          min={10}
                          max={600}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height: {selectedOverlay.height}</Label>
                        <Slider
                          value={[selectedOverlay.height]}
                          onValueChange={([v]) => updateOverlay(selectedOverlay.id, { height: v })}
                          min={0}
                          max={600}
                          step={1}
                        />
                      </div>
                    </div>
                    {selectedOverlay.shape !== "line" && (
                      <div>
                        <Label className="text-xs">Fill Color</Label>
                        <input
                          type="color"
                          value={selectedOverlay.fillColor || "#3b82f6"}
                          onChange={(e) => updateOverlay(selectedOverlay.id, { fillColor: e.target.value })}
                          className="w-full h-8 rounded border border-input cursor-pointer"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Stroke Color</Label>
                      <input
                        type="color"
                        value={selectedOverlay.strokeColor || "#ffffff"}
                        onChange={(e) => updateOverlay(selectedOverlay.id, { strokeColor: e.target.value })}
                        className="w-full h-8 rounded border border-input cursor-pointer"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Stroke Width: {selectedOverlay.strokeWidth}px</Label>
                      <Slider
                        value={[selectedOverlay.strokeWidth]}
                        onValueChange={([v]) => updateOverlay(selectedOverlay.id, { strokeWidth: v })}
                        min={0}
                        max={20}
                        step={1}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Opacity: {Math.round(selectedOverlay.opacity * 100)}%</Label>
                      <Slider
                        value={[selectedOverlay.opacity]}
                        onValueChange={([v]) => updateOverlay(selectedOverlay.id, { opacity: v })}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Canva placeholder */}
            <Button size="sm" variant="ghost" className="w-full text-muted-foreground" disabled>
              <ExternalLink className="h-4 w-4 mr-1" /> Open in Canva — Coming Soon
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save as New Asset"}
          </Button>

          {/* Publish / Schedule dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                disabled={compatibleConnections.length === 0}
                title={compatibleConnections.length === 0 ? "Connect social accounts in Marketing → Social Accounts" : "Publish or schedule to social media"}
              >
                <Send className="h-4 w-4 mr-1" /> Publish
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              {compatibleConnections.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                  No social accounts connected for this format
                </DropdownMenuItem>
              ) : (
                <>
                  {compatibleConnections.map((conn) => (
                    <DropdownMenuItem
                      key={conn.id}
                      onClick={async () => {
                        setPublishing(true);
                        try {
                          const blob = await exportCanvas();
                          if (!blob) { toast.error("Export failed"); return; }
                          // Upload to storage first
                          const path = `media/social-${crypto.randomUUID()}.png`;
                          const { error: upErr } = await supabase.storage.from("app-media").upload(path, blob);
                          if (upErr) throw upErr;
                          const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(path);
                          // Call publish function
                          const { error } = await supabase.functions.invoke("publish-to-social", {
                            body: { connection_id: conn.id, image_url: urlData.publicUrl, caption: publishCaption },
                          });
                          if (error) throw error;
                          toast.success(`Published to ${PLATFORM_LABELS[conn.platform]}!`);
                        } catch (e: any) {
                          toast.error(e?.message || "Publish failed");
                        } finally {
                          setPublishing(false);
                        }
                      }}
                      disabled={publishing}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white rounded p-0.5" style={{ backgroundColor: PLATFORM_COLORS[conn.platform] }}>
                          {PLATFORM_ICONS_SM[conn.platform]}
                        </span>
                        <span>{conn.account_name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={() => {
                      if (compatibleConnections.length > 0) {
                        setScheduleConnection(compatibleConnections[0]);
                        setScheduleDialogOpen(true);
                      }
                    }}
                  >
                    <CalendarClock className="h-4 w-4 mr-2" /> Schedule for Later
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Caption input for social posts */}
          {compatibleConnections.length > 0 && (
            <div className="w-full">
              <Textarea
                placeholder="Caption for social posts (optional)..."
                value={publishCaption}
                onChange={(e) => setPublishCaption(e.target.value)}
                className="text-sm h-16 resize-none"
              />
            </div>
          )}
        </DialogFooter>

        {/* Schedule Dialog */}
        {scheduleDialogOpen && (
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Schedule Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Platform</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        {scheduleConnection && (
                          <>
                            <span className="text-white rounded p-0.5" style={{ backgroundColor: PLATFORM_COLORS[scheduleConnection.platform] }}>
                              {PLATFORM_ICONS_SM[scheduleConnection.platform]}
                            </span>
                            {scheduleConnection.account_name}
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {compatibleConnections.map((conn) => (
                        <DropdownMenuItem key={conn.id} onClick={() => setScheduleConnection(conn)}>
                          <span className="text-white rounded p-0.5 mr-2" style={{ backgroundColor: PLATFORM_COLORS[conn.platform] }}>
                            {PLATFORM_ICONS_SM[conn.platform]}
                          </span>
                          {conn.account_name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <Label className="text-sm">Date</Label>
                  <UiPopover>
                    <UiPopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start", !scheduleDate && "text-muted-foreground")}>
                        <Clock className="h-4 w-4 mr-2" />
                        {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                      </Button>
                    </UiPopoverTrigger>
                    <UiPopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        disabled={(date) => date < new Date()}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </UiPopoverContent>
                  </UiPopover>
                </div>
                <div>
                  <Label className="text-sm">Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
                <Button
                  disabled={!scheduleDate || !scheduleConnection || schedulePost.isPending}
                  onClick={async () => {
                    if (!scheduleDate || !scheduleConnection) return;
                    try {
                      const blob = await exportCanvas();
                      if (!blob) { toast.error("Export failed"); return; }
                      const path = `media/scheduled-${crypto.randomUUID()}.png`;
                      const { error: upErr } = await supabase.storage.from("app-media").upload(path, blob);
                      if (upErr) throw upErr;
                      const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(path);
                      const [hours, minutes] = scheduleTime.split(":").map(Number);
                      const scheduledAt = new Date(scheduleDate);
                      scheduledAt.setHours(hours, minutes, 0, 0);
                      await schedulePost.mutateAsync({
                        connection_id: scheduleConnection.id,
                        platform: scheduleConnection.platform,
                        image_url: urlData.publicUrl,
                        caption: publishCaption,
                        scheduled_at: scheduledAt.toISOString(),
                      });
                      setScheduleDialogOpen(false);
                    } catch (e: any) {
                      toast.error(e?.message || "Scheduling failed");
                    }
                  }}
                >
                  <CalendarClock className="h-4 w-4 mr-1" /> Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>

      {/* Media Picker for overlay images */}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(url) => addLogoFromUrl(url)}
        excludeCategories={["tournament", "games", "challenges"]}
      />

      {/* Media Picker for background image — no category filter */}
      <MediaPickerDialog
        open={bgPickerOpen}
        onOpenChange={setBgPickerOpen}
        onSelect={(url) => setBaseImageUrl(url)}
      />
    </Dialog>
  );
};

export default AssetEditorDialog;
