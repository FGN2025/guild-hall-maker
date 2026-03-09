import { useState } from "react";
import { useTenantCodes, TenantCode } from "@/hooks/useTenantCodes";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, KeyRound, Copy, Megaphone, CalendarDays, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const CODE_TYPES = ["campaign", "override", "access", "tracking", "verification"] as const;

interface EditForm {
  id: string;
  description: string;
  code_type: string;
  max_uses: string;
  expires_at: string;
}

const TenantCodes = ({ embedded }: { embedded?: boolean }) => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId ?? null;
  const isReadOnly = tenantInfo?.tenantRole === "marketing";
  const { codes, isLoading, createCode, updateCode, deleteCode } = useTenantCodes(tenantId);
  const { campaigns } = useMarketingCampaigns(true);
  const campaignMap = new Map(campaigns.map((c) => [c.id, c.title]));
  const [typeFilter, setTypeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", code_type: "campaign" as string,
    max_uses: "", expires_at: "",
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const filtered = typeFilter === "all"
    ? codes
    : codes.filter((c) => c.code_type === typeFilter);

  const handleCreate = () => {
    if (!form.code.trim()) { toast.error("Code is required."); return; }
    createCode.mutate({
      code: form.code,
      description: form.description,
      code_type: form.code_type,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
    }, {
      onSuccess: () => {
        setForm({ code: "", description: "", code_type: "campaign", max_uses: "", expires_at: "" });
        setCreateOpen(false);
      },
    });
  };

  const openEdit = (c: TenantCode) => {
    setEditForm({
      id: c.id,
      description: c.description || "",
      code_type: c.code_type,
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editForm) return;
    updateCode.mutate(
      {
        id: editForm.id,
        description: editForm.description.trim() || undefined,
        code_type: editForm.code_type,
        max_uses: editForm.max_uses ? parseInt(editForm.max_uses) : null,
        expires_at: editForm.expires_at || null,
      },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!embedded && (
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Codes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage promo, campaign, and tracking codes for your organization.
            </p>
          </div>
        )}
        {embedded && <div />}
        {!isReadOnly && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Create Code</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">New Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input placeholder="SUMMER2026" value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.code_type} onValueChange={(v) => setForm({ ...form, code_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CODE_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="What is this code for?" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Uses (optional)</Label>
                    <Input type="number" placeholder="Unlimited" value={form.max_uses}
                      onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires At (optional)</Label>
                    <Input type="datetime-local" value={form.expires_at}
                      onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createCode.isPending} className="w-full">
                  {createCode.isPending ? "Creating..." : "Create Code"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({codes.length})</TabsTrigger>
          {CODE_TYPES.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t} ({codes.filter((c) => c.code_type === t).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <KeyRound className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No codes yet.{!isReadOnly && " Create your first one."}</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-center">Active</TableHead>
                {!isReadOnly && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className={!c.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold text-foreground">{c.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => copyCode(c.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{c.code_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.campaign_id ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Megaphone className="h-3 w-3" />
                        {campaignMap.get(c.campaign_id) || "Campaign"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(c as any).event_id ? (
                      <span className="flex items-center gap-1 text-primary">
                        <CalendarDays className="h-3 w-3" />
                        Event
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {c.description || "—"}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "Never"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={c.is_active}
                      disabled={isReadOnly}
                      onCheckedChange={(checked) => updateCode.mutate({ id: c.id, is_active: checked })}
                    />
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          onClick={() => deleteCode.mutate(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Code</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={codes.find((c) => c.id === editForm.id)?.code ?? ""} disabled className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.code_type} onValueChange={(v) => setEditForm({ ...editForm, code_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CODE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Uses (blank = unlimited)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="∞"
                    value={editForm.max_uses}
                    onChange={(e) => setEditForm({ ...editForm, max_uses: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.expires_at}
                    onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleEdit} disabled={updateCode.isPending} className="w-full">
                {updateCode.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantCodes;
