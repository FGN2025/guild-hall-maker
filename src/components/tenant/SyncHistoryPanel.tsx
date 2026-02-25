import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { SyncLogEntry } from "@/hooks/useSyncLogs";

interface SyncHistoryPanelProps {
  logs: SyncLogEntry[];
  isLoading: boolean;
}

const PAGE_SIZE = 15;

const SyncHistoryPanel = ({ logs, isLoading }: SyncHistoryPanelProps) => {
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const providerTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.provider_type))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (providerFilter !== "all" && log.provider_type !== providerFilter) return false;
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      return true;
    });
  }, [logs, providerFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const handleProviderChange = (v: string) => { setProviderFilter(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };

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
    <>
    <div className="flex flex-wrap gap-3 mb-4">
      <Select value={providerFilter} onValueChange={handleProviderChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Providers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Providers</SelectItem>
          {providerTypes.map((pt) => (
            <SelectItem key={pt} value={pt}>
              {pt.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="success">Success</SelectItem>
          <SelectItem value="error">Error</SelectItem>
        </SelectContent>
      </Select>
      {(providerFilter !== "all" || statusFilter !== "all") && (
        <span className="text-sm text-muted-foreground self-center">
          {filtered.length} of {logs.length} records
        </span>
      )}
    </div>
    {filtered.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        No sync logs match the selected filters.
      </div>
    ) : (
    <>
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
          {paginatedLogs.map((log) => (
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
    {totalPages > 1 && (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <PaginationItem key={p}>
              <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )}
    </>
    )}
    </>
  );
};

export default SyncHistoryPanel;
