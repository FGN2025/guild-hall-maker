import { useState } from "react";
import { useWebPages } from "@/hooks/useWebPages";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Loader2, Trash2 } from "lucide-react";
import WebPageEditor from "@/components/webpages/WebPageEditor";
import { toast } from "sonner";

const TenantWebPages = ({ embedded }: { embedded?: boolean }) => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId ?? null;
  const { pages, isLoadingPages, createPage, deletePage } = useWebPages(tenantId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const handleCreate = () => {
    if (!newTitle.trim() || !newSlug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    createPage.mutate(
      { title: newTitle.trim(), slug: newSlug.trim(), tenant_id: tenantId },
      {
        onSuccess: (page) => {
          setCreateOpen(false);
          setNewTitle("");
          setNewSlug("");
          setEditingId(page.id);
        },
      }
    );
  };

  if (editingId) {
    return <WebPageEditor pageId={editingId} tenantId={tenantId} onBack={() => setEditingId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!embedded && (
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Web Pages</h1>
            <p className="text-sm text-muted-foreground">Create and manage promotional web pages</p>
          </div>
        )}
        {embedded && <div />}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Page</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Web Page</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-heading">Title</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="My Landing Page" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-heading">Slug</Label>
                <Input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="my-landing-page"
                />
              </div>
              <Button onClick={handleCreate} disabled={createPage.isPending} className="w-full">
                {createPage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Page
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoadingPages ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-heading">No web pages yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditingId(page.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-heading">{page.title}</CardTitle>
                  <Badge variant={page.is_published ? "default" : "secondary"} className="text-[10px]">
                    {page.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">/{page.slug}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(page.updated_at).toLocaleDateString()}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => { e.stopPropagation(); deletePage.mutate(page.id); }}
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

export default TenantWebPages;
