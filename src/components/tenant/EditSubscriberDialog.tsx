import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TenantSubscriber } from "@/hooks/useTenantSubscribers";

interface EditSubscriberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriber: TenantSubscriber | null;
  onSave: (id: string, fields: Partial<TenantSubscriber>) => void;
  isSaving: boolean;
}

export default function EditSubscriberDialog({ open, onOpenChange, subscriber, onSave, isSaving }: EditSubscriberDialogProps) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    zip_code: "",
    account_number: "",
    plan_name: "",
    service_status: "active",
  });

  useEffect(() => {
    if (subscriber) {
      setForm({
        first_name: subscriber.first_name || "",
        last_name: subscriber.last_name || "",
        email: subscriber.email || "",
        phone: subscriber.phone || "",
        address: subscriber.address || "",
        zip_code: subscriber.zip_code || "",
        account_number: subscriber.account_number || "",
        plan_name: subscriber.plan_name || "",
        service_status: subscriber.service_status || "active",
      });
    }
  }, [subscriber]);

  const handleSave = () => {
    if (!subscriber) return;
    onSave(subscriber.id, form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Subscriber</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
            <Label>Account #</Label>
            <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Plan</Label>
            <Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.service_status} onValueChange={(v) => setForm({ ...form, service_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
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
