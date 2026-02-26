import { useState, useRef } from "react";
import { useTenantMarketingAssets, TenantMarketingAsset } from "@/hooks/useTenantMarketingAssets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TenantMarketingAssets = () => {
  const { assets, isLoading, uploadAsset, togglePublish, deleteAsset } = useTenantMarketingAssets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !label.trim()) return;
    uploadAsset.mutate({ file, label: label.trim(), notes: notes.trim() || undefined }, {
      onSuccess: () => {
        setDialogOpen(false);
        setLabel("");
        setNotes("");
        if (fileRef.current) fileRef.current.value = "";
      },
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">Your branded marketing assets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="h-4 w-4 mr-2" /> Upload Asset</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Marketing Asset</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Facebook Banner" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." />
              </div>
              <div>
                <Label>File</Label>
                <Input ref={fileRef} type="file" accept="image/*" />
              </div>
              <Button onClick={handleUpload} disabled={uploadAsset.isPending || !label.trim()} className="w-full">
                {uploadAsset.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No assets yet. Upload one or save from the Marketing Library.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a: TenantMarketingAsset) => (
            <Card key={a.id} className="overflow-hidden">
              <img src={a.url} alt={a.label} className="w-full h-40 object-cover" />
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-sm font-medium truncate">{a.label}</span>
                  <Badge variant={a.is_published ? "default" : "secondary"}>
                    {a.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                {a.notes && <p className="text-xs text-muted-foreground line-clamp-2">{a.notes}</p>}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={a.is_published}
                      onCheckedChange={(v) => togglePublish.mutate({ id: a.id, is_published: v })}
                    />
                    <span className="text-xs text-muted-foreground">Publish</span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteAsset.mutate({ id: a.id, file_path: a.file_path })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantMarketingAssets;
