import { useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileUp, CheckCircle2, AlertTriangle, MinusCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface ParsedRow {
  providerName: string;
  zips: string[];
  matchedTenantId: string | null;
  matchedTenantName: string | null;
  status: "matched" | "unmatched" | "empty";
  assignedTenantId: string | null;
  skip: boolean;
}

interface BulkZipImportDialogProps {
  tenants: Tenant[];
  onComplete: () => void;
  refetchTenants?: () => void;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function BulkZipImportDialog({ tenants, onComplete, refetchTenants }: BulkZipImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"upload" | "review" | "importing" | "done">("upload");
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState({ inserted: 0, skipped: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  // Local tenants list that includes newly created ones
  const [localTenants, setLocalTenants] = useState<Tenant[]>([]);
  const allTenants = useMemo(() => {
    const map = new Map<string, Tenant>();
    tenants.forEach((t) => map.set(t.id, t));
    localTenants.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [tenants, localTenants]);

  // "Add as New" inline form state
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const tenantMap = useMemo(() => {
    const map = new Map<string, Tenant>();
    allTenants.forEach((t) => map.set(t.name.trim().toLowerCase(), t));
    return map;
  }, [allTenants]);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    const dataLines = lines.slice(1);
    const parsed: ParsedRow[] = dataLines.map((line) => {
      const match = line.match(/^"?([^"]*?)"?\s*,\s*"?(.*?)"?\s*$/);
      const providerName = match ? match[1].trim() : line.split(",")[0].trim();
      const zipStr = match ? match[2].trim() : "";
      const zips = zipStr
        ? zipStr.split(/[,\s]+/).map((z) => z.trim()).filter((z) => /^\d{4,5}$/.test(z))
        : [];

      const key = providerName.toLowerCase();
      const tenant = tenantMap.get(key);

      return {
        providerName,
        zips,
        matchedTenantId: tenant?.id ?? null,
        matchedTenantName: tenant?.name ?? null,
        status: zips.length === 0 ? "empty" : tenant ? "matched" : "unmatched",
        assignedTenantId: null,
        skip: zips.length === 0,
      };
    });
    return parsed;
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setStep("review");
    };
    reader.readAsText(file);
  };

  const matched = rows.filter((r) => r.status === "matched");
  const unmatched = rows.filter((r) => r.status === "unmatched");
  const empty = rows.filter((r) => r.status === "empty");

  const totalZips = rows.reduce((sum, r) => {
    if (r.skip) return sum;
    const tid = r.matchedTenantId || r.assignedTenantId;
    return tid ? sum + r.zips.length : sum;
  }, 0);

  const handleAssign = (idx: number, tenantId: string) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, assignedTenantId: tenantId, skip: false } : r
      )
    );
  };

  const handleSkip = (idx: number) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, skip: true, assignedTenantId: null } : r
      )
    );
  };

  const openAddNew = (idx: number) => {
    const row = rows[idx];
    setAddingIdx(idx);
    setNewName(row.providerName);
    setNewSlug(slugify(row.providerName));
    setNewActive(true);
  };

  const cancelAddNew = () => {
    setAddingIdx(null);
    setNewName("");
    setNewSlug("");
    setNewActive(true);
  };

  const confirmAddNew = async () => {
    if (!newName.trim() || !newSlug.trim() || addingIdx === null) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .insert({
          name: newName.trim(),
          slug: newSlug.trim(),
          status: newActive ? "active" : "inactive",
        } as any)
        .select("id, name, slug")
        .single();
      if (error) throw error;

      const newTenant: Tenant = { id: data.id, name: data.name, slug: data.slug };
      setLocalTenants((prev) => [...prev, newTenant]);

      // Update the row to matched
      setRows((prev) =>
        prev.map((r, i) =>
          i === addingIdx
            ? { ...r, matchedTenantId: newTenant.id, matchedTenantName: newTenant.name, status: "matched" as const, skip: false }
            : r
        )
      );

      refetchTenants?.();
      toast.success(`Provider "${newTenant.name}" created.`);
      cancelAddNew();
    } catch (err: any) {
      toast.error(err.message || "Failed to create provider.");
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async () => {
    setStep("importing");
    setProgress(0);

    const toInsert: { tenant_id: string; zip_code: string }[] = [];
    rows.forEach((r) => {
      if (r.skip) return;
      const tid = r.matchedTenantId || r.assignedTenantId;
      if (!tid) return;
      r.zips.forEach((z) => toInsert.push({ tenant_id: tid, zip_code: z }));
    });

    if (toInsert.length === 0) {
      toast.error("No ZIP codes to import.");
      setStep("review");
      return;
    }

    let inserted = 0;
    let skipped = 0;
    const chunkSize = 50;

    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("tenant_zip_codes")
        .upsert(chunk as any, { onConflict: "tenant_id,zip_code", ignoreDuplicates: true });

      if (error) {
        toast.error(`Import error: ${error.message}`);
        skipped += chunk.length;
      } else {
        inserted += chunk.length;
      }
      setProgress(Math.round(((i + chunk.length) / toInsert.length) * 100));
    }

    setImportResult({ inserted, skipped });
    setStep("done");
    onComplete();
  };

  const reset = () => {
    setRows([]);
    setStep("upload");
    setProgress(0);
    setImportResult({ inserted: 0, skipped: 0 });
    setLocalTenants([]);
    cancelAddNew();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" /> Bulk Import ZIPs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Bulk ZIP Code Import</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with columns: <code className="text-xs bg-muted px-1 py-0.5 rounded">Provider Name, Zipcodes</code>.
              ZIP codes can be comma-separated within the cell.
            </p>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to select CSV file</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 py-2">
            <div className="flex gap-3 text-sm">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {matched.length} Matched
              </Badge>
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {unmatched.length} Unmatched
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <MinusCircle className="h-3 w-3" /> {empty.length} No ZIPs
              </Badge>
            </div>

            {/* Matched providers */}
            {matched.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">✅ Matched Providers</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {matched.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1 bg-muted/50 rounded">
                      <span className="text-foreground">{r.providerName}</span>
                      <span className="text-muted-foreground">{r.zips.length} ZIPs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unmatched providers */}
            {unmatched.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">⚠️ Unmatched Providers</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {rows.map((r, idx) => {
                    if (r.status !== "unmatched") return null;
                    const isAdding = addingIdx === idx;
                    return (
                      <div key={idx} className="px-2 py-1.5 bg-destructive/5 rounded border border-destructive/20">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-foreground block truncate">
                              {r.providerName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{r.zips.length} ZIPs</span>
                          </div>
                          {r.skip ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">Skipped</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() =>
                                  setRows((prev) =>
                                    prev.map((row, i) => (i === idx ? { ...row, skip: false } : row))
                                  )
                                }
                              >
                                Undo
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Select
                                value={r.assignedTenantId || ""}
                                onValueChange={(v) => handleAssign(idx, v)}
                              >
                                <SelectTrigger className="h-7 w-36 text-[10px]">
                                  <SelectValue placeholder="Assign to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {allTenants.map((t) => (
                                    <SelectItem key={t.id} value={t.id} className="text-xs">
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] px-2 gap-1"
                                onClick={() => openAddNew(idx)}
                              >
                                <Plus className="h-3 w-3" /> Add New
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] px-2"
                                onClick={() => handleSkip(idx)}
                              >
                                Skip
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Inline "Add as New" form */}
                        {isAdding && (
                          <div className="mt-2 p-2 bg-muted/50 rounded border border-border space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground">Name</label>
                                <Input
                                  value={newName}
                                  onChange={(e) => {
                                    setNewName(e.target.value);
                                    setNewSlug(slugify(e.target.value));
                                  }}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Slug</label>
                                <Input
                                  value={newSlug}
                                  onChange={(e) => setNewSlug(e.target.value)}
                                  className="h-7 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Switch checked={newActive} onCheckedChange={setNewActive} />
                                <span className="text-[10px] text-muted-foreground">
                                  {newActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={cancelAddNew}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-3"
                                  onClick={confirmAddNew}
                                  disabled={creating || !newName.trim() || !newSlug.trim()}
                                >
                                  {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Ready to import <strong className="text-foreground">{totalZips}</strong> ZIP codes
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleImport} disabled={totalZips === 0}>
                  Import ZIPs
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing ZIP codes...</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
            <p className="text-sm text-foreground font-medium">Import Complete</p>
            <p className="text-xs text-muted-foreground">
              {importResult.inserted} ZIP codes processed · {importResult.skipped} errors
            </p>
            <Button size="sm" onClick={() => { setOpen(false); reset(); }}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
