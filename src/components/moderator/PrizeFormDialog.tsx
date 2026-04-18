import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, X } from "lucide-react";
import { validateAndToast } from "@/lib/imageValidation";
import { useImageLimits } from "@/hooks/useImageLimits";

export interface PrizeFormValues {
  name: string;
  description: string;
  points_cost: string;
  quantity_available: string;
}

interface PrizeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: PrizeFormValues & { image_url?: string | null };
  onSubmit: (values: PrizeFormValues, imageFile: File | null) => void;
  isPending: boolean;
}

const empty: PrizeFormValues = { name: "", description: "", points_cost: "", quantity_available: "" };

const PrizeFormDialog = ({ open, onOpenChange, title, initial, onSubmit, isPending }: PrizeFormDialogProps) => {
  const { getPreset } = useImageLimits();
  const [form, setForm] = useState<PrizeFormValues>(initial ?? empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.image_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial ?? empty);
      setImageFile(null);
      setPreview(initial?.image_url ?? null);
    }
  }, [open, initial]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await validateAndToast(file, getPreset("cardCover"));
    if (!ok) { e.target.value = ""; return; }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Image upload */}
          <div className="space-y-2">
            <Label>Image</Label>
            {preview ? (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border border-border">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-video rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-xs">Click to upload image</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />
            {preview && (
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Change image
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Prize name..." />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Prize description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Points Cost</Label>
              <Input type="number" min={0} value={form.points_cost} onChange={(e) => setForm({ ...form, points_cost: e.target.value })} />
              <p className="text-xs text-muted-foreground">Recommended bands: Common 50–150 · Rare 200–400 · Epic 500–800 · Legendary 1000+</p>
            </div>
            <div className="space-y-2">
              <Label>Quantity (blank = unlimited)</Label>
              <Input type="number" min={0} value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: e.target.value })} />
            </div>
          </div>
          <Button
            onClick={() => onSubmit(form, imageFile)}
            disabled={isPending || !form.name.trim()}
            className="w-full"
          >
            {isPending ? "Saving..." : "Save Prize"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrizeFormDialog;
