import { useRef, useState } from "react";
import { useCanvasEditor, Overlay } from "@/hooks/useCanvasEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ImagePlus, Type, Trash2, Download, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface AssetEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseImageUrl: string;
  onSave: (blob: Blob) => Promise<void>;
}

const AssetEditorDialog = ({ open, onOpenChange, baseImageUrl, onSave }: AssetEditorDialogProps) => {
  const {
    canvasRef,
    canvasSize,
    selectedOverlay,
    addLogo,
    addText,
    updateOverlay,
    deleteOverlay,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    exportCanvas,
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
    a.download = `edited-asset-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Asset Editor</DialogTitle>
        </DialogHeader>

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
            />
          </div>

          {/* Toolbar */}
          <div className="w-full lg:w-64 space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-1" /> Logo
              </Button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button size="sm" variant="outline" onClick={addText}>
                <Type className="h-4 w-4 mr-1" /> Text
              </Button>
            </div>

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
