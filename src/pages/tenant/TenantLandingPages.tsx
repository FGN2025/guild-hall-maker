import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useWebPages, usePageTemplates, type WebPage } from "@/hooks/useWebPages";
import WebPageEditor from "@/components/webpages/WebPageEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

const slugify = (input: string) =>
  input.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `page-${Date.now()}`;

/**
 * Tenant Landing Pages — list + editor for standalone branded pages
 * (excludes the is_tenant_banner row, which lives in TenantBanner).
 */
const TenantLandingPages = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId ?? null;
  const { pages, isLoadingPages, createPage, createFromTemplate, deletePage } = useWebPages(tenantId);
  const { data: templates = [] } = usePageTemplates();

  const landing = pages.filter((p) => !(p as any).is_tenant_banner);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    // Auto-select the first landing page on load if none selected
    if (!selectedPageId && landing.length > 0) setSelectedPageId(landing[0].id);
    // Clear selection if the selected page was deleted
    if (selectedPageId && !landing.some((p) => p.id === selectedPageId)) setSelectedPageId(null);
  }, [landing, selectedPageId]);

  const handleCreate = async () => {
    if (!tenantId) return;
    const title = newTitle.trim();
    if (!title) { toast.error("Give the page a title"); return; }
    const slug = slugify(title);
    try {
      const page = selectedTemplateId
        ? await createFromTemplate.mutateAsync({ template_id: selectedTemplateId, title, slug, tenant_id: tenantId })
        : await createPage.mutateAsync({ title, slug, tenant_id: tenantId });
      setSelectedPageId((page as any).id);
      setNewOpen(false); setNewTitle(""); setSelectedTemplateId(null);
    } catch { /* toast handled in hook */ }
  };

  const renderRow = (p: WebPage) => {
    const now = Date.now();
    const scheduled = p.publish_at && new Date(p.publish_at).getTime() > now;
    const expired = p.unpublish_at && new Date(p.unpublish_at).getTime() <= now;
    return (
      <button
        key={p.id}
        onClick={() => setSelectedPageId(p.id)}
        className={`w-full text-left rounded-md border px-3 py-2.5 transition ${
          selectedPageId === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
        }`}
      >
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-heading text-sm font-medium truncate">{p.title}</div>
            <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
            <div className="mt-1 flex gap-1 flex-wrap">
              {p.is_published ? (
                <Badge variant="default" className="text-[10px]">Published</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Draft</Badge>
              )}
              {scheduled && <Badge variant="outline" className="text-[10px]">Scheduled</Badge>}
              {expired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
            </div>
          </div>
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
        </div>
      </button>
    );
  };

  if (!tenantId || !tenantInfo) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">No tenant selected.</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 mb-2">
            <Link to="/tenant/marketing?tab=webpages"><ArrowLeft className="h-4 w-4" /> Marketing</Link>
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Tenant Landing Pages
          </h1>
          <p className="text-sm text-muted-foreground">
            Standalone branded pages published at <code className="text-xs">/pages/{tenantInfo.tenantSlug ?? "<tenant>"}/&lt;slug&gt;</code>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Pages</div>
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setNewOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>
          {isLoadingPages ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : landing.length === 0 ? (
            <Card><CardContent className="py-4 text-xs text-muted-foreground text-center">
              No landing pages yet. Create your first branded page to build a home for your esports service.
            </CardContent></Card>
          ) : (
            <div className="space-y-1.5">{landing.map(renderRow)}</div>
          )}
        </div>

        <div className="min-w-0">
          {selectedPageId ? (
            <WebPageEditor
              key={selectedPageId}
              pageId={selectedPageId}
              tenantId={tenantId}
              onBack={() => { /* list stays visible */ }}
              tenantBranding={{
                logoUrl: tenantInfo?.logoUrl,
                primaryColor: tenantInfo?.primaryColor,
                accentColor: tenantInfo?.accentColor,
              }}
            />
          ) : (
            <Card><CardContent className="py-16 text-center text-muted-foreground text-sm">
              Pick a page from the list, or create a new one.
            </CardContent></Card>
          )}
        </div>
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
              {newTitle && <p className="text-xs text-muted-foreground">URL: /pages/{tenantInfo.tenantSlug ?? "<tenant>"}/{slugify(newTitle)}</p>}
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

export default TenantLandingPages;
