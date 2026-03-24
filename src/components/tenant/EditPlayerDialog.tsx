import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UnifiedPlayer } from "@/hooks/useTenantPlayers";

interface EditPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: UnifiedPlayer | null;
  onSave: (id: string, fields: Record<string, string>) => void;
  isSaving: boolean;
}

export default function EditPlayerDialog({ open, onOpenChange, player, onSave, isSaving }: EditPlayerDialogProps) {
  const [form, setForm] = useState({
    legacy_username: "",
    email: "",
    first_name: "",
    last_name: "",
    address: "",
    zip_code: "",
    invite_code: "",
  });

  useEffect(() => {
    if (player && player.source === "legacy") {
      setForm({
        legacy_username: player.gamerTag || "",
        email: player.email || "",
        first_name: player.name.split(" ")[0] || "",
        last_name: player.name.split(" ").slice(1).join(" ") || "",
        address: player.address || "",
        zip_code: player.zip || "",
        invite_code: player.inviteCode || "",
      });
    }
  }, [player]);

  if (!player || player.source !== "legacy") return null;

  const handleSave = () => {
    onSave(player.id, form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Legacy Player</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Username</Label>
            <Input value={form.legacy_username} onChange={(e) => setForm({ ...form, legacy_username: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>ZIP Code</Label>
            <Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Invite Code</Label>
            <Input value={form.invite_code} onChange={(e) => setForm({ ...form, invite_code: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
