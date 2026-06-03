import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useCalendarImages, CalendarImage } from "@/hooks/useCalendarImages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, Plus } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

const AdminCalendarImages = () => {
  usePageTitle("Calendar Images");
  const { images, isLoading, upsert, isUpserting, remove } = useCalendarImages();

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [file, setFile] = useState<File | null>(null);

  const handleSave = () => {
    if (!file) return;
    upsert(
      { year, month, file },
      {
        onSuccess: () => {
          setOpen(false);
          setFile(null);
        },
      }
    );
  };

  const openFor = (img?: CalendarImage) => {
    if (img) {
      setYear(img.year);
      setMonth(img.month);
    } else {
      setYear(currentYear);
      setMonth(new Date().getMonth() + 1);
    }
    setFile(null);
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Calendar Images</h1>
        <Button onClick={() => openFor()}>
          <Plus className="h-4 w-4 mr-2" /> Upload Image
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Upload one image per month. The image shown on{" "}
        <code className="text-primary">/calendar</code> automatically matches the
        month the user is browsing.
      </p>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No calendar images uploaded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="aspect-square bg-muted/30">
                <img
                  src={img.image_url}
                  alt={`${MONTHS[img.month - 1]} ${img.year}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="font-heading font-semibold">
                  {MONTHS[img.month - 1]} {img.year}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openFor(img)}>
                    <Upload className="h-3 w-3 mr-1" /> Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete ${MONTHS[img.month - 1]} ${img.year}?`)) {
                        remove(img);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Calendar Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select
                  value={String(year)}
                  onValueChange={(v) => setYear(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Image file</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-1">
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Uploading replaces any existing image for that month.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!file || isUpserting}>
              {isUpserting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCalendarImages;
