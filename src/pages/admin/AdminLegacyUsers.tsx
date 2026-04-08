import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Legacy Import</h1>

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
