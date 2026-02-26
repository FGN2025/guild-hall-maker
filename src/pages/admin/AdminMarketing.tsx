import { useState } from "react";
import { useMarketingCampaigns, useMarketingAssets, MarketingCampaign } from "@/hooks/useMarketingCampaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Upload, Eye, EyeOff, Megaphone, Image as ImageIcon, Library } from "lucide-react";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import AssetEditorDialog from "@/components/media/AssetEditorDialog";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "social_media", label: "Social Media" },
  { value: "print", label: "Print" },
  { value: "email", label: "Email" },
  { value: "event", label: "Event" },
];

const AdminMarketing = () => {
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useMarketingCampaigns();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingCampaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<MarketingCampaign | null>(null);

  const [form, setForm] = useState({ title: "", description: "", social_copy: "", category: "social_media" });

  const openCreate = () => { setEditing(null); setForm({ title: "", description: "", social_copy: "", category: "social_media" }); setDialogOpen(true); };
  const openEdit = (c: MarketingCampaign) => { setEditing(c); setForm({ title: c.title, description: c.description ?? "", social_copy: c.social_copy ?? "", category: c.category }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    if (editing) {
      await updateCampaign.mutateAsync({ id: editing.id, ...form });
    } else {
      await createCampaign.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" /> Marketing Library
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage marketing campaigns for tenants</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Campaign</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : campaigns.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No campaigns yet. Create your first one!</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <Card key={c.id} className="group cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setDetailCampaign(c)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-heading">{c.title}</CardTitle>
                    <Badge variant={c.is_published ? "default" : "secondary"}>
                      {c.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="mb-2 capitalize">{c.category.replace("_", " ")}</Badge>
                  {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                  <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => updateCampaign.mutate({ id: c.id, is_published: !c.is_published })}>
                      {c.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCampaign.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create / Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Campaign" : "New Campaign"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Social Copy</Label><Textarea value={form.social_copy} onChange={(e) => setForm({ ...form, social_copy: e.target.value })} placeholder="Suggested post text for tenants" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createCampaign.isPending || updateCampaign.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Campaign detail / asset manager */}
        {detailCampaign && (
          <CampaignAssetsDialog campaign={detailCampaign} onClose={() => setDetailCampaign(null)} />
        )}
      </div>
    
  );
};

function CampaignAssetsDialog({ campaign, onClose }: { campaign: MarketingCampaign; onClose: () => void }) {
  const { assets, isLoading, uploadAsset, deleteAsset, addAssetFromUrl } = useMarketingAssets(campaign.id);
  const [label, setLabel] = useState("Square");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [editorAssetUrl, setEditorAssetUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAsset.mutateAsync({ file, label });
    e.target.value = "";
  };

  const handleMediaSelect = async (url: string, filePath?: string) => {
    const fp = filePath || url.split("/app-media/")[1] || url;
    await addAssetFromUrl.mutateAsync({ url, file_path: fp, label });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{campaign.title} — Assets</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <Label>Label</Label>
              <Select value={label} onValueChange={setLabel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Square">Square</SelectItem>
                  <SelectItem value="Vertical">Vertical</SelectItem>
                  <SelectItem value="Horizontal">Horizontal</SelectItem>
                  <SelectItem value="Banner">Banner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Label htmlFor="asset-upload" className="cursor-pointer">
              <Button asChild disabled={uploadAsset.isPending}>
                <span><Upload className="h-4 w-4 mr-2" /> Upload</span>
              </Button>
              <input id="asset-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </Label>
            <Button variant="outline" onClick={() => setMediaPickerOpen(true)} disabled={addAssetFromUrl.isPending}>
              <Library className="h-4 w-4 mr-2" /> Media Library
            </Button>
          </div>

          <MediaPickerDialog open={mediaPickerOpen} onOpenChange={setMediaPickerOpen} onSelect={handleMediaSelect} />

          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : assets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No assets uploaded yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {assets.map((a) => (
                <div key={a.id} className="relative group rounded-lg overflow-hidden border border-border">
                  <img src={a.url} alt={a.label} className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Badge className="bg-background/80 text-foreground">{a.label}</Badge>
                    <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80" onClick={() => setEditorAssetUrl(a.url)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteAsset.mutate({ id: a.id, file_path: a.file_path })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editorAssetUrl && (
          <AssetEditorDialog
            open={!!editorAssetUrl}
            onOpenChange={(open) => { if (!open) setEditorAssetUrl(null); }}
            baseImageUrl={editorAssetUrl}
            onSave={async (blob) => {
              const file = new File([blob], `edited-${Date.now()}.png`, { type: "image/png" });
              await uploadAsset.mutateAsync({ file, label });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AdminMarketing;
