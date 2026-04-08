import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

const AdminLegacyUsers = () => {
  const [importing, setImporting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const queryClient = useQueryClient();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target?.result as string);
      setPreview(rows);
      toast.info(`Parsed ${rows.length} rows from CSV`);
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-legacy-users", {
        body: { rows: preview },
      });
      if (error) throw error;
      toast.success(`Imported ${data.inserted} users. ${data.skipped} skipped.`);
      if (data.errors?.length) {
        data.errors.forEach((e: string) => toast.error(e));
      }
      setPreview([]);
      queryClient.invalidateQueries({ queryKey: ["legacy-users"] });
      queryClient.invalidateQueries({ queryKey: ["legacy-user-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleBulkMigrate = async () => {
    if (!confirm("This will create auth accounts for unmatched legacy users in chunks of 200. Continue?")) return;
    setMigrating(true);
    setMigrationLog([]);
    const chunkSize = 200;
    let totalCreated = 0;
    let totalMatched = 0;
    let totalSkipped = 0;
    let chunk = 1;

    try {
      while (true) {
        setMigrationLog(prev => [...prev, `Processing chunk ${chunk} (${chunkSize} users)...`]);
        const { data, error } = await supabase.functions.invoke("bulk-register-legacy-users", {
          body: { batch_size: 50, max_count: chunkSize },
        });
        if (error) throw error;

        totalCreated += data.created || 0;
        totalMatched += data.auto_matched || 0;
        totalSkipped += data.skipped || 0;
        const processed = data.total_processed || 0;

        setMigrationLog(prev => [...prev, `Chunk ${chunk}: ${data.created} created, ${data.auto_matched} matched, ${data.skipped} skipped (${processed} processed)`]);

        if (data.errors?.length) {
          setMigrationLog(prev => [...prev, ...data.errors.slice(0, 3).map((e: string) => `  Error: ${e}`)]);
        }

        // If fewer than chunkSize were processed, we're done
        if (processed < chunkSize) break;
        chunk++;
      }

      toast.success(`Migration complete: ${totalCreated} created, ${totalMatched} auto-matched, ${totalSkipped} skipped.`);
      setMigrationLog(prev => [...prev, `✅ Done! ${totalCreated} created, ${totalMatched} matched, ${totalSkipped} skipped.`]);
      queryClient.invalidateQueries({ queryKey: ["legacy-users"] });
      queryClient.invalidateQueries({ queryKey: ["legacy-user-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Migration failed");
      setMigrationLog(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Legacy Import</h1>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Bulk Migrate Legacy Users</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create auth accounts for all unmatched legacy users with emails. They will be pre-confirmed and can log in using "Forgot Password" to set their new password.
            </p>
            <Button onClick={handleBulkMigrate} disabled={migrating} variant="default">
              {migrating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Migrating...</> : "Migrate All Legacy Users"}
            </Button>
            {migrationLog.length > 0 && (
              <div className="mt-4 rounded-md border bg-muted/30 p-3 max-h-48 overflow-auto text-xs font-mono space-y-1">
                {migrationLog.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Import Legacy Users CSV</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept=".csv" onChange={handleFileSelect} />
            {preview.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">{preview.length} rows ready to import</p>
                <div className="rounded-md border max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Provider</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 20).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row["Username"] || "—"}</TableCell>
                          <TableCell className="text-xs">{row["Email"] || "—"}</TableCell>
                          <TableCell className="text-xs">{row["Provider Name"] || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {preview.length > 20 && <p className="text-center text-xs text-muted-foreground py-2">...and {preview.length - 20} more</p>}
                </div>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importing...</> : `Import ${preview.length} Users`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminLegacyUsers;
