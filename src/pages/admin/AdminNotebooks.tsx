import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useNotebookConnections, NotebookConnection } from "@/hooks/useNotebookConnections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Activity, Loader2, BookOpen, FileText, StickyNote, Search, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminNotebooks = () => {
  const {
    connections, isLoading, addConnection, updateConnection, deleteConnection,
    testHealth, fetchSources, fetchNotes, searchNotebook,
  } = useNotebookConnections();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editConn, setEditConn] = useState<NotebookConnection | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", api_url: "", notebook_id: "", game_id: "" });

  // Sources dialog
  const [sourcesConn, setSourcesConn] = useState<NotebookConnection | null>(null);
  const [sourcesData, setSourcesData] = useState<any[] | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // Notes dialog
  const [notesConn, setNotesConn] = useState<NotebookConnection | null>(null);
  const [notesData, setNotesData] = useState<any[] | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  // Search dialog
  const [searchConn, setSearchConn] = useState<NotebookConnection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const { data: games = [] } = useQuery({
    queryKey: ["notebook-games"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // --- Add / Edit ---
  const openAdd = () => {
    setEditConn(null);
    setForm({ name: "", api_url: "", notebook_id: "", game_id: "" });
    setDialogOpen(true);
  };

  const openEdit = (conn: NotebookConnection) => {
    setEditConn(conn);
    setForm({ name: conn.name, api_url: conn.api_url, notebook_id: conn.notebook_id, game_id: conn.game_id || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.api_url || !form.notebook_id) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    const payload = { ...form, game_id: form.game_id || null };
    if (editConn) {
      await updateConnection.mutateAsync({ id: editConn.id, ...payload });
    } else {
      await addConnection.mutateAsync(payload);
    }
    setForm({ name: "", api_url: "", notebook_id: "", game_id: "" });
    setDialogOpen(false);
    setEditConn(null);
  };

  const handleTest = async (conn: NotebookConnection) => {
    setTesting(conn.id);
    try {
      const result = await testHealth(conn.api_url, conn.id);
      toast({
        title: result?.status === "healthy" ? "Connection healthy ✓" : "Connection failed",
        variant: result?.status === "healthy" ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Test failed", variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  // --- Sources ---
  const openSources = async (conn: NotebookConnection) => {
    setSourcesConn(conn);
    setSourcesData(null);
    setSourcesLoading(true);
    try {
      const data = await fetchSources(conn.api_url, conn.notebook_id);
      const items = Array.isArray(data) ? data : Array.isArray(data?.sources) ? data.sources : [];
      setSourcesData(items);
    } catch {
      toast({ title: "Failed to load sources", variant: "destructive" });
      setSourcesConn(null);
    } finally {
      setSourcesLoading(false);
    }
  };

  // --- Notes ---
  const openNotes = async (conn: NotebookConnection) => {
    setNotesConn(conn);
    setNotesData(null);
    setNotesLoading(true);
    try {
      const data = await fetchNotes(conn.api_url, conn.notebook_id);
      const items = Array.isArray(data) ? data : Array.isArray(data?.notes) ? data.notes : [];
      setNotesData(items);
    } catch {
      toast({ title: "Failed to load notes", variant: "destructive" });
      setNotesConn(null);
    } finally {
      setNotesLoading(false);
    }
  };

  // --- Search ---
  const openSearch = (conn: NotebookConnection) => {
    setSearchConn(conn);
    setSearchQuery("");
    setSearchResults(null);
  };

  const runSearch = async () => {
    if (!searchConn || !searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await searchNotebook(searchConn.api_url, searchConn.notebook_id, searchQuery);
      const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setSearchResults(items);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setSearchLoading(false);
    }
  };

  const isSaving = addConnection.isPending || updateConnection.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Notebook Connections</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage Open Notebook connections for the AI Coach</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Connection
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notebook connections yet. Add one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn) => (
            <Card key={conn.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-heading">{conn.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {conn.last_health_status && (
                      <Badge variant={conn.last_health_status === "healthy" ? "default" : "destructive"}>
                        {conn.last_health_status}
                      </Badge>
                    )}
                    <Switch
                      checked={conn.is_active}
                      onCheckedChange={(checked) => updateConnection.mutate({ id: conn.id, is_active: checked })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1 text-sm text-muted-foreground mb-4">
                  <p><span className="font-medium text-foreground">URL:</span> {conn.api_url}</p>
                  <p><span className="font-medium text-foreground">Notebook ID:</span> {conn.notebook_id}</p>
                  {conn.game_id && (
                    <p><span className="font-medium text-foreground">Game:</span> {games.find((g: any) => g.id === conn.game_id)?.name || conn.game_id}</p>
                  )}
                  {conn.last_health_check && (
                    <p><span className="font-medium text-foreground">Last check:</span> {new Date(conn.last_health_check).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleTest(conn)} disabled={testing === conn.id}>
                    {testing === conn.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Activity className="h-4 w-4 mr-1" />}
                    Test
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openSources(conn)}>
                    <FileText className="h-4 w-4 mr-1" /> Sources
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openNotes(conn)}>
                    <StickyNote className="h-4 w-4 mr-1" /> Notes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openSearch(conn)}>
                    <Search className="h-4 w-4 mr-1" /> Test Search
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(conn)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteConnection.mutate(conn.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditConn(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editConn ? "Edit Connection" : "Add Notebook Connection"}</DialogTitle>
            <DialogDescription>{editConn ? "Update the connection details." : "Connect to an Open Notebook instance on your VPS."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="e.g. Valorant Guides" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>API URL</Label>
              <Input placeholder="https://notebook.yourdomain.com:5055" value={form.api_url} onChange={(e) => setForm((p) => ({ ...p, api_url: e.target.value }))} />
            </div>
            <div>
              <Label>Notebook ID</Label>
              <Input placeholder="notebook:xxxxx" value={form.notebook_id} onChange={(e) => setForm((p) => ({ ...p, notebook_id: e.target.value }))} />
            </div>
            <div>
              <Label>Game (optional)</Label>
              <Select value={form.game_id || "none"} onValueChange={(v) => setForm((p) => ({ ...p, game_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="No game" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No game (global)</SelectItem>
                  {games.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Link this notebook to a game for AI quest narrative context</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditConn(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} {editConn ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sources Dialog */}
      <Dialog open={!!sourcesConn} onOpenChange={(o) => { if (!o) setSourcesConn(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sources — {sourcesConn?.name}</DialogTitle>
            <DialogDescription>Documents and data sources loaded in this notebook.</DialogDescription>
          </DialogHeader>
          {sourcesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : sourcesData && sourcesData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sources found in this notebook.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {sourcesData?.map((s: any, i: number) => (
                  <Card key={i} className="p-3">
                    <p className="font-medium text-sm text-foreground">{s.name || s.title || s.filename || `Source ${i + 1}`}</p>
                    {s.type && <p className="text-xs text-muted-foreground">Type: {s.type}</p>}
                    {s.size && <p className="text-xs text-muted-foreground">Size: {s.size}</p>}
                    {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesConn} onOpenChange={(o) => { if (!o) setNotesConn(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notes — {notesConn?.name}</DialogTitle>
            <DialogDescription>Read-only view of notes saved in this notebook.</DialogDescription>
          </DialogHeader>
          {notesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : notesData && notesData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No notes found in this notebook.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {notesData?.map((n: any, i: number) => (
                  <Card key={i} className="p-3">
                    {n.title && <p className="font-medium text-sm text-foreground mb-1">{n.title}</p>}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.content || n.text || JSON.stringify(n)}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={!!searchConn} onOpenChange={(o) => { if (!o) setSearchConn(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Search — {searchConn?.name}</DialogTitle>
            <DialogDescription>Preview the RAG snippets the AI Coach would retrieve for a query.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Enter a search query…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button onClick={runSearch} disabled={searchLoading || !searchQuery.trim()}>
              {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchResults !== null && (
            searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No results found.</p>
            ) : (
              <ScrollArea className="max-h-[350px] mt-2">
                <div className="space-y-2">
                  {searchResults.map((r: any, i: number) => (
                    <Card key={i} className="p-3">
                      {r.source && <Badge variant="outline" className="mb-1 text-xs">{r.source}</Badge>}
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {r.content || r.text || r.snippet || JSON.stringify(r)}
                      </p>
                      {r.score != null && <p className="text-xs text-muted-foreground mt-1">Score: {Number(r.score).toFixed(3)}</p>}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNotebooks;
