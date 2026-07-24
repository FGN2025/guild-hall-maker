import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SECTION_TYPES, SECTION_GROUPS } from "@/hooks/useWebPages";
import { Image, Type, LayoutGrid, MousePointerClick, Code2, RectangleHorizontal, Video, CalendarDays } from "lucide-react";

const ICONS: Record<string, typeof Image> = {
  hero: Image,
  text_block: Type,
  image_gallery: LayoutGrid,
  cta: MousePointerClick,
  embed_widget: Code2,
  banner: RectangleHorizontal,
  video: Video,
  featured_events: CalendarDays,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: string) => void;
}

const AddSectionDialog = ({ open, onOpenChange, onSelect }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">Add a section</DialogTitle>
        <DialogDescription>Pick a building block for this page. You can rearrange or remove it later.</DialogDescription>
      </DialogHeader>
      <div className="space-y-5">
        {SECTION_GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <div>
              <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">{group.label}</div>
              <div className="text-xs text-muted-foreground/80">{group.description}</div>
            </div>
            <div className="grid gap-2">
              {group.types.map((typeVal) => {
                const t = SECTION_TYPES.find((s) => s.value === typeVal);
                if (!t) return null;
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
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default AddSectionDialog;
