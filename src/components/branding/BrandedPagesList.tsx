import { useState } from "react";
import { useWebPages, usePageTemplates, type WebPage } from "@/hooks/useWebPages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FileText, Radio, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tenantId: string;
  selectedPageId: string | null;
  onSelect: (id: string) => void;
}

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `page-${Date.now()}`;

const BrandedPagesList = ({ tenantId, selectedPageId, onSelect }: Props) => {
  const { pages, isLoadingPages, createPage, createFromTemplate, deletePage } = useWebPages(tenantId);
  const { data: templates = [] } = usePageTemplates();

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) { toast.error("Give the page a title"); return; }
    const slug = slugify(title);
    if (selectedTemplateId) {
      const page = await createFromTemplate.mutateAsync({
        template_id: selectedTemplateId, title, slug, tenant_id: tenantId,
      });
      onSelect((page as any).id);
    } else {
      const page = await createPage.mutateAsync({ title, slug, tenant_id: tenantId });
      onSelect((page as any).id);
    }
    setNewOpen(false); setNewTitle(""); setSelectedTemplateId(null);
  };

  const banner = pages.find((p) => (p as any).is_tenant_banner);
  const landing = pages.filter((p) => !(p as any).is_tenant_banner);

  const renderRow = (p: WebPage) => {
    const isBanner = !!(p as any).is_tenant_banner;
    const now = Date.now();
    const scheduled = p.publish_at && new Date(p.publish_at).getTime() > now;
    const expired = p.unpublish_at && new Date(p.unpublish_at).getTime() <= now;
    return (
      <button
        key={p.id}
        onClick={() => onSelect(p.id)}
        className={`w-full text-left rounded-md border px-3 py-2.5 transition ${
          selectedPageId === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
        }`}
      >
        <div className="flex items-start gap-2">
          {isBanner ? <Radio className="h-4 w-4 text-primary mt-0.5 shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="font-heading text-sm font-medium truncate">{p.title}</div>
            <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
            <div className="mt-1 flex gap-1 flex-wrap">
              {isBanner && <Badge variant="secondary" className="text-[10px]">Live across portal</Badge>}
              {p.is_published ? (
                <Badge variant="default" className="text-[10px]">Published</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Draft</Badge>
              )}
              {scheduled && <Badge variant="outline" className="text-[10px]">Scheduled</Badge>}
              {expired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
            </div>
          </div>
          {!isBanner && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${p.title}"? This cannot be undone.`)) deletePage.mutate(p.id);
              }}
              className="text-muted-foreground hover:text-destructive p-1 rounded"
              title="Delete page"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Portal Banner</div>
        {banner ? renderRow(banner) : (
          <Card><CardContent className="py-3 text-xs text-muted-foreground">Banner will initialize automatically.</CardContent></Card>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Landing Pages</div>
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>
        {isLoadingPages ? (
          <div className="text-xs text-muted-foreground py-2">Loading…</div>
        ) : landing.length === 0 ? (
          <Card><CardContent className="py-4 text-xs text-muted-foreground text-center">
            No landing pages yet. Create your first branded page to build a home for your esports service.
          </CardContent></Card>
        ) : (
          <div className="space-y-1.5">{landing.map(renderRow)}</div>
        )}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New landing page</DialogTitle>
            <DialogDescription>Start blank or pick a template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Page title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Summer Tournament" />
              {newTitle && <p className="text-xs text-muted-foreground">URL: /pages/&lt;tenant&gt;/{slugify(newTitle)}</p>}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Start from</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedTemplateId(null)}
                  className={`text-left rounded-md border p-3 text-xs ${
                    selectedTemplateId === null ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-heading font-medium mb-0.5">Blank page</div>
                  <div className="text-muted-foreground">Start with an empty canvas.</div>
                </button>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`text-left rounded-md border p-3 text-xs ${
                      selectedTemplateId === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-heading font-medium mb-0.5">{t.name}</div>
                    <div className="text-muted-foreground line-clamp-2">{t.description || t.category}</div>
                  </button>
                ))}
              </div>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">No templates published yet — start from blank.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createPage.isPending || createFromTemplate.isPending}>
              Create page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandedPagesList;
export { slugify };
