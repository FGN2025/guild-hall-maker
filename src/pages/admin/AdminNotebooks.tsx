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
import { Plus, Trash2, Activity, Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminNotebooks = () => {
  const { connections, isLoading, addConnection, updateConnection, deleteConnection, testHealth } = useNotebookConnections();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", api_url: "", notebook_id: "" });

  const handleAdd = async () => {
    if (!form.name || !form.api_url || !form.notebook_id) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    await addConnection.mutateAsync(form);
    setForm({ name: "", api_url: "", notebook_id: "" });
    setDialogOpen(false);
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

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Notebook Connections</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage Open Notebook connections for the AI Coach</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
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
                    {conn.last_health_check && (
                      <p><span className="font-medium text-foreground">Last check:</span> {new Date(conn.last_health_check).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleTest(conn)} disabled={testing === conn.id}>
                      {testing === conn.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Activity className="h-4 w-4 mr-1" />}
                      Test
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Notebook Connection</DialogTitle>
              <DialogDescription>Connect to an Open Notebook instance on your VPS.</DialogDescription>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addConnection.isPending}>
                {addConnection.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default AdminNotebooks;
