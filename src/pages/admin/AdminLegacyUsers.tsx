import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Users, UserCheck, UserX, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLegacyUsers, useLegacyUserStats } from "@/hooks/useLegacyUsers";
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
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading } = useLegacyUsers();
  const { data: stats } = useLegacyUserStats();
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

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.legacy_username.toLowerCase().includes(s) ||
      (u.email || "").toLowerCase().includes(s) ||
      (u.provider_name || "").toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Legacy Users</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Legacy</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{stats?.total ?? "—"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Matched</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-500" />{stats?.matched ?? "—"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unmatched</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold flex items-center gap-2"><UserX className="h-5 w-5 text-destructive" />{stats?.unmatched ?? "—"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Verified</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats?.verified ?? "—"}</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="import">Import CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search username, email, provider..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No legacy users found</TableCell></TableRow>
                    ) : filtered.slice(0, 100).map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.legacy_username}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{u.email || "—"}</TableCell>
                        <TableCell><Badge variant="default" className="text-xs">{u.provider_name || "None"}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={u.status === "verified" ? "default" : "secondary"} className="text-xs">
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.matched_user_id ? <Badge className="bg-green-600 text-xs">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{u.legacy_created_at ? new Date(u.legacy_created_at).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length > 100 && (
                  <p className="text-center text-xs text-muted-foreground py-2">Showing 100 of {filtered.length} results</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminLegacyUsers;
