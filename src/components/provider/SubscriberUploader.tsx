import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileUp, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUBSCRIBER_FIELDS = [
  { key: "account_number", label: "Account Number" },
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "zip_code", label: "ZIP Code" },
  { key: "service_status", label: "Service Status" },
  { key: "plan_name", label: "Plan Name" },
  { key: "external_id", label: "External ID" },
] as const;

interface SubscriberUploaderProps {
  tenantId: string;
  onImport: (rows: Record<string, string | null>[]) => void;
  isImporting: boolean;
}

const SubscriberUploader = ({ tenantId, onImport, isImporting }: SubscriberUploaderProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      setCsvHeaders(headers);
      const rows = lines.slice(1).map((line) =>
        line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
      );
      setCsvRows(rows);

      // Auto-map by fuzzy match
      const autoMap: Record<string, string> = {};
      SUBSCRIBER_FIELDS.forEach((field) => {
        const match = headers.find(
          (h) => h.toLowerCase().replace(/[_\s]/g, "") === field.key.replace(/_/g, "")
        );
        if (match) autoMap[field.key] = match;
      });
      setFieldMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const mapped = csvRows.map((row) => {
      const record: Record<string, string | null> = { tenant_id: tenantId, source: "csv" };
      SUBSCRIBER_FIELDS.forEach((field) => {
        const csvCol = fieldMapping[field.key];
        if (csvCol) {
          const idx = csvHeaders.indexOf(csvCol);
          record[field.key] = idx >= 0 ? row[idx] || null : null;
        } else {
          record[field.key] = null;
        }
      });
      return record;
    });
    onImport(mapped);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload CSV
          </CardTitle>
          <CardDescription>
            Upload a CSV file with subscriber data. Map columns to fields, then import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="max-w-xs" />
            {csvRows.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {csvRows.length} rows found
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {csvHeaders.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Map Columns</CardTitle>
              <CardDescription>Match each CSV column to a subscriber field</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SUBSCRIBER_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-32 shrink-0">{field.label}</span>
                    <Select
                      value={fieldMapping[field.key] || "__skip__"}
                      onValueChange={(v) =>
                        setFieldMapping((prev) => ({
                          ...prev,
                          [field.key]: v === "__skip__" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">— Skip —</SelectItem>
                        {csvHeaders.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview (first 5 rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvHeaders.map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    "Importing..."
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" /> Import {csvRows.length} Subscribers
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SubscriberUploader;
