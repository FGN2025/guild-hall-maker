import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Coins, AlertTriangle, CheckCircle2, Download, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface SheetRow {
  row_number: number;
  values: Record<string, unknown>;
}

interface ResolvedRow {
  row_number: number;
  discord: string;
  points: number | null;
  user_id: string | null;
  display_name: string | null;
  matched_via: "profile" | "legacy" | null;
  current_points: number;
  current_available: number;
  reason: string;
}

interface Summary {
  season: { id: string; name: string };
  total_rows: number;
  matched: number;
  unmatched: number;
  total_points: number;
  matched_via_profile: number;
  matched_via_legacy: number;
  counts: Record<string, number>;
  already_imported: { batch_id: string; imported_at: string } | null;
}

const REASON_LABEL: Record<string, string> = {
  no_match: "No account found for that Discord handle",
  blank_discord: "Discord handle blank",
  invalid_points: "Points missing, zero, or not a number",
  ambiguous: "Handle matches more than one account",
  duplicate_discord: "Duplicate handle earlier in the file",
};

const guessColumn = (headers: string[], needles: string[]) =>
  headers.find((h) => needles.some((n) => h.toLowerCase().includes(n))) ?? "";

const toCsv = (rows: string[][]) =>
  rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

const AdminPointsImport = () => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [discordCol, setDiscordCol] = useState("");
  const [pointsCol, setPointsCol] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [matched, setMatched] = useState<ResolvedRow[]>([]);
  const [unmatched, setUnmatched] = useState<ResolvedRow[]>([]);
  const [lastBatch, setLastBatch] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: seasons = [] } = useQuery({
    queryKey: ["import-seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons").select("id, name, status").eq("status", "active").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeSeasonId = seasonId || seasons[0]?.id || "";

  const resetResults = () => {
    setSummary(null);
    setMatched([]);
    setUnmatched([]);
    setLastBatch(null);
  };

  const handleFile = async (file: File) => {
    resetResults();
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!json.length) {
        toast.error("That sheet has no data rows.");
        return;
      }
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setSheetRows(json.map((values, i) => ({ row_number: i + 2, values })));
      setDiscordCol(guessColumn(hdrs, ["discord"]));
      setPointsCol(guessColumn(hdrs, ["point", "score", "balance"]));
      toast.success(`Loaded ${json.length} rows from ${file.name}`);
    } catch (e) {
      toast.error(`Could not read that file: ${(e as Error).message}`);
    }
  };

  const payloadRows = useMemo(
    () =>
      sheetRows.map((r) => ({
        row_number: r.row_number,
        discord: String(r.values[discordCol] ?? ""),
        points: r.values[pointsCol],
      })),
    [sheetRows, discordCol, pointsCol],
  );

  const callFn = async (action: "preview" | "apply", force = false) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-points", {
        body: {
          action,
          force,
          rows: payloadRows,
          season_id: activeSeasonId || undefined,
          file_name: fileName,
        },
      });
      if (error) {
        const details = (error as any)?.context?.text ? await (error as any).context.text() : error.message;
        throw new Error(details || error.message);
      }
      if (data?.error) throw new Error(data.error);

      setSummary(data.summary);
      setMatched(data.matched ?? matched);
      setUnmatched(data.unmatched ?? []);
      if (action === "apply") {
        setLastBatch(data.batch_id);
        toast.success(`Imported ${data.applied} balances.`);
        if (data.failures?.length) toast.error(`${data.failures.length} rows failed to write.`);
      } else {
        toast.success("Dry run complete — review below before importing.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const rollback = async () => {
    if (!lastBatch) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-points", {
        body: { action: "rollback", batch_id: lastBatch },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Reverted ${data.reverted} balances.`);
      setLastBatch(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadUnmatched = () => {
    const csv = toCsv([
      ["row_number", "discord_username", "points", "reason"],
      ...unmatched.map((r) => [
        String(r.row_number),
        r.discord,
        String(r.points ?? ""),
        REASON_LABEL[r.reason] ?? r.reason,
      ]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `unmatched-points-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canPreview = sheetRows.length > 0 && !!discordCol && !!pointsCol && !busy;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3 mb-2">
          <Coins className="h-8 w-8 text-primary" />
          Points Import
        </h1>
        <p className="text-muted-foreground font-body">
          Bulk-credit season points from a spreadsheet, matched on Discord username. Imported points land in the
          same wallet as tournament, challenge, and quest earnings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">1. Upload spreadsheet</CardTitle>
          <CardDescription>CSV or Excel. The first sheet's first row is treated as headers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" onClick={() => fileInput.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Choose file
            </Button>
            {fileName && <span className="text-sm text-muted-foreground font-mono">{fileName}</span>}
            {sheetRows.length > 0 && <Badge variant="secondary">{sheetRows.length} rows</Badge>}
          </div>

          {headers.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Discord username column</Label>
                <Select value={discordCol} onValueChange={(v) => { setDiscordCol(v); resetResults(); }}>
                  <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points column</Label>
                <Select value={pointsCol} onValueChange={(v) => { setPointsCol(v); resetResults(); }}>
                  <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target season</Label>
                <Select value={activeSeasonId} onValueChange={(v) => { setSeasonId(v); resetResults(); }}>
                  <SelectTrigger><SelectValue placeholder="Active season" /></SelectTrigger>
                  <SelectContent>
                    {seasons.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button onClick={() => callFn("preview")} disabled={!canPreview} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Run dry-run preview
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">2. Preview</CardTitle>
              <CardDescription>
                Crediting <strong>{summary.season.name}</strong> — both lifetime and spendable points.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Rows", value: summary.total_rows },
                  { label: "Matched", value: summary.matched },
                  { label: "Unmatched", value: summary.unmatched },
                  { label: "Points to credit", value: summary.total_points },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground font-heading uppercase tracking-wide">{s.label}</p>
                    <p className="text-2xl font-bold font-mono">{s.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                Matched via profile Discord: {summary.matched_via_profile} · via legacy user record:{" "}
                {summary.matched_via_legacy}
              </p>

              {summary.already_imported && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>This file looks already imported</AlertTitle>
                  <AlertDescription>
                    An identical import ran on {new Date(summary.already_imported.imported_at).toLocaleString()}.
                    Importing again will double-credit these players.
                  </AlertDescription>
                </Alert>
              )}

              {matched.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden max-h-[420px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Discord</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Matched via</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">+ Import</TableHead>
                        <TableHead className="text-right">New total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matched.map((r) => (
                        <TableRow key={r.row_number}>
                          <TableCell className="text-muted-foreground">{r.row_number}</TableCell>
                          <TableCell className="font-mono text-xs">{r.discord}</TableCell>
                          <TableCell>{r.display_name ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.matched_via}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{r.current_points}</TableCell>
                          <TableCell className="text-right font-mono text-primary">+{r.points}</TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {r.current_points + (r.points ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy || summary.matched === 0 || !!lastBatch}
                  className="gap-2"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  Import {summary.matched} balances ({summary.total_points} pts)
                </Button>
                {unmatched.length > 0 && (
                  <Button variant="outline" onClick={downloadUnmatched} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download {unmatched.length} unmatched
                  </Button>
                )}
                {lastBatch && (
                  <Button variant="destructive" onClick={rollback} disabled={busy} className="gap-2">
                    <Undo2 className="h-4 w-4" />
                    Undo this import
                  </Button>
                )}
              </div>

              {lastBatch && (
                <p className="text-xs text-muted-foreground font-mono">Batch ID: {lastBatch}</p>
              )}
            </CardContent>
          </Card>

          {unmatched.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Skipped rows ({unmatched.length})
                </CardTitle>
                <CardDescription>
                  These are not imported. Fix the handles in your sheet and re-upload just those rows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Discord</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmatched.map((r) => (
                        <TableRow key={r.row_number}>
                          <TableCell className="text-muted-foreground">{r.row_number}</TableCell>
                          <TableCell className="font-mono text-xs">{r.discord || "—"}</TableCell>
                          <TableCell className="font-mono">{r.points ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {REASON_LABEL[r.reason] ?? r.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Import points?"
        description={`This credits ${summary?.total_points ?? 0} points across ${summary?.matched ?? 0} players in ${summary?.season.name ?? ""}. Points become immediately spendable in the Prize Shop. You can undo the batch afterwards.`}
        confirmLabel="Import"
        onConfirm={() => callFn("apply", !!summary?.already_imported)}
      />
    </div>
  );
};

export default AdminPointsImport;
