import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useWebPages } from "@/hooks/useWebPages";
import WebPageEditor from "@/components/webpages/WebPageEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const AdminWebPages = () => {
  const { pages, isLoadingPages, createPage, deletePage } = useWebPages();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const handleCreate = () => {
    if (!newTitle || !newSlug) return;
    createPage.mutate(
      { title: newTitle, slug: newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-") },
      { onSuccess: (page) => { setCreateOpen(false); setNewTitle(""); setNewSlug(""); setEditingId(page.id); } }
    );
  };

  if (editingId) {
    return (
      <AdminLayout>
        <WebPageEditor pageId={editingId} onBack={() => setEditingId(null)} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Web Pages</h1>
            <p className="text-muted-foreground font-heading text-sm mt-1">Build and manage multi-section web pages</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Page
          </Button>
        </div>

        {isLoadingPages ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : pages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-heading text-muted-foreground">No web pages yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pages.map((page) => (
              <Card key={page.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setEditingId(page.id)}>
                <CardContent className="flex items-center gap-4 py-4">
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-foreground truncate">{page.title}</h3>
                    <p className="text-xs text-muted-foreground">/{page.slug} · Updated {new Date(page.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={page.is_published ? "default" : "secondary"}>
                    {page.is_published ? "Published" : "Draft"}
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{page.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this page and all its sections.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePage.mutate(page.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create New Page</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-heading">Title</Label>
                <Input value={newTitle} onChange={(e) => { setNewTitle(e.target.value); if (!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-heading">Slug</Label>
                <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newTitle || !newSlug || createPage.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminWebPages;
