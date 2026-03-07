import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SECTION_TYPES } from "@/hooks/useWebPages";
import { Image, Type, LayoutGrid, MousePointerClick, Code2, RectangleHorizontal, Video } from "lucide-react";

const ICONS: Record<string, typeof Image> = {
  hero: Image,
  text_block: Type,
  image_gallery: LayoutGrid,
  cta: MousePointerClick,
  embed_widget: Code2,
  banner: RectangleHorizontal,
  video: Video,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: string) => void;
}

const AddSectionDialog = ({ open, onOpenChange, onSelect }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">Add Section</DialogTitle>
      </DialogHeader>
      <div className="grid gap-2">
        {SECTION_TYPES.map((t) => {
          const Icon = ICONS[t.value] ?? Type;
          return (
            <Button
              key={t.value}
              variant="outline"
              className="justify-start gap-3 h-auto py-3 text-left"
              onClick={() => { onSelect(t.value); onOpenChange(false); }}
            >
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="font-heading font-medium text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.description}</div>
              </div>
            </Button>
          );
        })}
      </div>
    </DialogContent>
  </Dialog>
);

export default AddSectionDialog;
