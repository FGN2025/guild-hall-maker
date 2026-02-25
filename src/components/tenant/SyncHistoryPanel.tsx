import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { SyncLogEntry } from "@/hooks/useSyncLogs";

interface SyncHistoryPanelProps {
  logs: SyncLogEntry[];
  isLoading: boolean;
}

const SyncHistoryPanel = ({ logs, isLoading }: SyncHistoryPanelProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sync history yet. Run a sync to see results here.
      </div>
    );
  }

  return (
    <div className="overflow-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Records</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="uppercase text-xs">
                  {log.provider_type}
                </Badge>
              </TableCell>
              <TableCell>
                {log.status === "success" ? (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Success
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Error
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{log.records_synced}</TableCell>
              <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                {log.message || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SyncHistoryPanel;
