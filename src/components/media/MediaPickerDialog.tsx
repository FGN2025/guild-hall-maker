import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Check } from "lucide-react";
import { useMediaLibrary, type MediaItem } from "@/hooks/useMediaLibrary";

const ALL_TABS = ["all", "games", "general", "tournament", "badge", "trophy", "banner"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, filePath?: string) => void;
  excludeCategories?: string[];
}

const MediaPickerDialog = ({ open, onOpenChange, onSelect }: Props) => {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { media, isLoading } = useMediaLibrary(tab);

  const filtered = useMemo(() => {
    if (!search) return media;
    const q = search.toLowerCase();
    return media.filter(
      (m) =>
        m.file_name.toLowerCase().includes(q) ||
        m.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [media, search]);

  const handleConfirm = () => {
    if (selected) {
      const item = filtered.find((m) => m.url === selected);
      onSelect(selected, item?.file_path);
      setSelected(null);
      setSearch("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Select from Media Library</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={tab} onValueChange={setTab} className="flex-1">
            <TabsList className="bg-muted">
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t} className="capitalize font-heading text-xs">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 mt-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 font-heading text-sm">
              No media found.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {filtered
                .filter((m) => m.file_type === "image")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.url === selected ? null : item.url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-90 ${
                      selected === item.url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {selected === item.url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary-foreground drop-shadow" />
                      </div>
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[10px] px-1 py-0.5 truncate font-body">
                      {item.file_name}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!selected} onClick={handleConfirm}>
            Use Selected
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPickerDialog;
