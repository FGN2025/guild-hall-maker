import { useState } from "react";
import { useTenantCodes, TenantCode } from "@/hooks/useTenantCodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, KeyRound, Copy, Unlink, Link } from "lucide-react";
import { toast } from "sonner";

const CODE_TYPES = ["campaign", "override", "access", "tracking", "verification"] as const;

interface CampaignCodeLinkerProps {
  campaignId?: string;
  campaignTitle?: string;
  eventId?: string;
  eventTitle?: string;
  tenantId: string | null;
  readOnly?: boolean;
}

const CampaignCodeLinker = ({ campaignId, campaignTitle, eventId, eventTitle, tenantId, readOnly = false }: CampaignCodeLinkerProps) => {
  const entityId = campaignId || eventId || "";
  const entityTitle = campaignTitle || eventTitle || "";
  const entityField = campaignId ? "campaign_id" : "event_id";
  const { codes, isLoading, createCode, updateCode } = useTenantCodes(tenantId);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", code_type: "campaign" as string,
    max_uses: "", expires_at: "",
  });

  const linkedCodes = codes.filter((c) => (entityField === "campaign_id" ? c.campaign_id === entityId : (c as any).event_id === entityId));
  const unlinkableCodes = codes.filter((c) => !c.campaign_id && !(c as any).event_id && c.is_active);

  const handleCreate = () => {
    if (!form.code.trim()) { toast.error("Code is required."); return; }
    createCode.mutate({
      code: form.code,
      description: form.description || `Code for ${entityTitle}`,
      code_type: form.code_type,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      campaign_id: campaignId || null,
      event_id: eventId || null,
    }, {
      onSuccess: () => {
        setForm({ code: "", description: "", code_type: "campaign", max_uses: "", expires_at: "" });
        setCreateOpen(false);
      },
    });
  };

  const handleLink = (codeId: string) => {
    updateCode.mutate({ id: codeId, [entityField]: entityId } as any);
    setLinkOpen(false);
  };

  const handleUnlink = (codeId: string) => {
    updateCode.mutate({ id: codeId, [entityField]: null } as any);
  };

  const handleUnlink = (codeId: string) => {
    updateCode.mutate({ id: codeId, campaign_id: null } as any);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Promo Codes
        </h3>
        {!readOnly && (
          <div className="flex gap-2">
            {unlinkableCodes.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                <Link className="h-3.5 w-3.5 mr-1" /> Link Existing
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Code
            </Button>
          </div>
        )}
      </div>

      {linkedCodes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No promo codes linked to this campaign.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {linkedCodes.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm ${!c.is_active ? "opacity-50" : ""}`}
            >
              <code className="font-mono font-semibold text-foreground">{c.code}</code>
              <Badge variant="outline" className="text-[10px] capitalize">{c.code_type}</Badge>
              <span className="text-muted-foreground text-xs">
                {c.times_used}{c.max_uses ? `/${c.max_uses}` : ""} used
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyCode(c.code)}>
                <Copy className="h-3 w-3" />
              </Button>
              {!readOnly && (
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive"
                  onClick={() => handleUnlink(c.id)} title="Unlink from campaign">
                  <Unlink className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link existing code dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Link Existing Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {unlinkableCodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unlinked codes available.</p>
            ) : (
              unlinkableCodes.map((c) => (
                <button
                  key={c.id}
                  className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted transition-colors text-left"
                  onClick={() => handleLink(c.id)}
                >
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-semibold text-sm">{c.code}</code>
                    <Badge variant="outline" className="text-[10px] capitalize">{c.code_type}</Badge>
                  </div>
                  <Link className="h-4 w-4 text-primary" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create new code dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">New Code for "{entityTitle}"</DialogTitle>
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
              {createCode.isPending ? "Creating..." : "Create & Link Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignCodeLinker;
