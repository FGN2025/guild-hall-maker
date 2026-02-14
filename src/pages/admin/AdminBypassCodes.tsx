import { useState } from "react";

import { useBypassCodes } from "@/hooks/useBypassCodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AdminBypassCodes = () => {
  const { codes, isLoading, createCode, toggleActive, deleteCode } = useBypassCodes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", max_uses: "", expires_at: "" });

  const handleCreate = () => {
    if (!form.code.trim()) return;
    createCode.mutate(
      {
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
      },
      {
        onSuccess: () => {
          setForm({ code: "", description: "", max_uses: "", expires_at: "" });
          setOpen(false);
        },
      }
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Bypass Codes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage invite codes that skip the ZIP verification during registration.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Create Bypass Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    placeholder="e.g. VIP2026"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="e.g. VIP invite batch 1"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Uses (blank = unlimited)</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="∞"
                      value={form.max_uses}
                      onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires At (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createCode.isPending} className="w-full">
                  {createCode.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : codes.length === 0 ? (
          <p className="text-muted-foreground">No bypass codes yet.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-heading">Code</th>
                  <th className="text-left p-3 font-heading">Description</th>
                  <th className="text-center p-3 font-heading">Uses</th>
                  <th className="text-center p-3 font-heading">Expires</th>
                  <th className="text-center p-3 font-heading">Active</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3 font-mono text-primary">{c.code}</td>
                    <td className="p-3 text-muted-foreground">{c.description || "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">
                        {c.times_used} / {c.max_uses ?? "∞"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center text-muted-foreground text-xs">
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: c.id, is_active: checked })
                        }
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCode.mutate(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminBypassCodes;
