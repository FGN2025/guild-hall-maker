import { useState, useRef } from "react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ZipEntry {
  id: string;
  tenant_id: string;
  zip_code: string;
  city: string | null;
  state: string | null;
  created_at: string;
}

const ProviderZipCodes = () => {
  const { tenantInfo } = useTenantAdmin();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ zip_code: "", city: "", state: "" });
  const [uploading, setUploading] = useState(false);

  const tenantId = tenantInfo?.tenantId || "";

  const { data: zips = [], isLoading } = useQuery({
    queryKey: ["provider-zips", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_zip_codes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("zip_code", { ascending: true });
      if (error) throw error;
      return data as ZipEntry[];
    },
  });

  const addZip = useMutation({
    mutationFn: async (input: { zip_code: string; city?: string; state?: string }) => {
      const { error } = await supabase.from("tenant_zip_codes").insert({
        tenant_id: tenantId,
        zip_code: input.zip_code,
        city: input.city || null,
        state: input.state || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-zips", tenantId] });
      toast.success("ZIP code added.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteZip = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_zip_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-zips", tenantId] });
      toast.success("ZIP code removed.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAdd = () => {
    if (!form.zip_code.trim() || form.zip_code.length !== 5) {
      toast.error("Enter a valid 5-digit ZIP code.");
      return;
    }
    addZip.mutate(
      { zip_code: form.zip_code.trim(), city: form.city.trim(), state: form.state.trim() },
      {
        onSuccess: () => {
          setForm({ zip_code: "", city: "", state: "" });
          setAddOpen(false);
        },
      }
    );
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());

      // Detect header
      const firstLine = lines[0].toLowerCase();
      const hasHeader =
        firstLine.includes("zip") || firstLine.includes("code") || firstLine.includes("city");
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const rows: { tenant_id: string; zip_code: string; city: string | null; state: string | null }[] = [];

      for (const line of dataLines) {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts[0] && /^\d{5}$/.test(parts[0])) {
          rows.push({
            tenant_id: tenantId,
            zip_code: parts[0],
            city: parts[1] || null,
            state: parts[2] || null,
          });
        }
      }

      if (rows.length === 0) {
        toast.error("No valid ZIP codes found in the CSV.");
        return;
      }

      // Batch insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from("tenant_zip_codes").upsert(chunk, {
          onConflict: "tenant_id,zip_code",
        });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["provider-zips", tenantId] });
      toast.success(`Uploaded ${rows.length} ZIP codes.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload CSV.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">ZIP Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the ZIP codes in your service area. {zips.length} total.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload CSV"}
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add ZIP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add ZIP Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input
                    placeholder="90210"
                    value={form.zip_code}
                    onChange={(e) =>
                      setForm({ ...form, zip_code: e.target.value.replace(/\D/g, "").slice(0, 5) })
                    }
                    maxLength={5}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City (optional)</Label>
                    <Input
                      placeholder="Beverly Hills"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State (optional)</Label>
                    <Input
                      placeholder="CA"
                      maxLength={2}
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <Button onClick={handleAdd} disabled={addZip.isPending} className="w-full">
                  {addZip.isPending ? "Adding..." : "Add ZIP Code"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV format: <code className="text-primary">zip_code,city,state</code> — one per line.
        Headers are auto-detected.
      </p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : zips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No ZIP codes yet. Add them individually or upload a CSV.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-heading">ZIP Code</th>
                <th className="text-left p-3 font-heading">City</th>
                <th className="text-left p-3 font-heading">State</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {zips.map((z) => (
                <tr key={z.id} className="border-t border-border">
                  <td className="p-3 font-mono text-primary">{z.zip_code}</td>
                  <td className="p-3 text-muted-foreground">{z.city || "—"}</td>
                  <td className="p-3">
                    {z.state ? (
                      <Badge variant="outline">{z.state}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteZip.mutate(z.id)}
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
  );
};

export default ProviderZipCodes;
