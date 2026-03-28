import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Navigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Upload, Plug, History, Download, FileText, Pencil, Trash2 } from "lucide-react";
import { exportTableCSV, exportTablePDF, type ExportColumn } from "@/lib/exportUserData";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useTenantSubscribers, type TenantSubscriber } from "@/hooks/useTenantSubscribers";
import { useTenantIntegrations, type TenantIntegration } from "@/hooks/useTenantIntegrations";
import { useSyncLogs } from "@/hooks/useSyncLogs";
import SubscriberUploader from "@/components/tenant/SubscriberUploader";
import IntegrationConfigCard from "@/components/tenant/IntegrationConfigCard";
import BillingConfigDialog from "@/components/tenant/BillingConfigDialog";
import SyncHistoryPanel from "@/components/tenant/SyncHistoryPanel";
import EditSubscriberDialog from "@/components/tenant/EditSubscriberDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const statusColor: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/30",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
};

const TenantSubscribers = () => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId;
  const isAdmin = tenantInfo?.tenantRole === "admin";
  const { subscribers, isLoading, bulkInsert, updateSubscriber, deleteSubscriber } = useTenantSubscribers(tenantId);
  const { integrations, saveIntegration, updateIntegration, triggerSync, deleteIntegration } = useTenantIntegrations(tenantId);
  const { logs: syncLogs, isLoading: syncLogsLoading } = useSyncLogs(tenantId);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "subscribers";
  const setActiveTab = (tab: string) => {
    setSearchParams(tab === "subscribers" ? {} : { tab }, { replace: true });
  };
  const [search, setSearch] = useState("");
  const [subPage, setSubPage] = useState(1);
  const subPageSize = 25;
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<TenantIntegration | null>(null);
  const [selectedProviderType, setSelectedProviderType] = useState<string>("nisc");

  // Edit/Delete state
  const [editSub, setEditSub] = useState<TenantSubscriber | null>(null);
  const [deleteSub, setDeleteSub] = useState<TenantSubscriber | null>(null);

  if (tenantInfo?.tenantRole === "manager") {
    return <Navigate to="/tenant" replace />;
  }

  const filtered = subscribers.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.account_number?.toLowerCase().includes(q) ||
      s.zip_code?.includes(q)
    );
  });

  const subTotalPages = Math.ceil(filtered.length / subPageSize);
  const paginatedSubs = filtered.slice((subPage - 1) * subPageSize, subPage * subPageSize);

  const counts = {
    total: subscribers.length,
    active: subscribers.filter((s) => s.service_status === "active").length,
    inactive: subscribers.filter((s) => s.service_status !== "active").length,
  };

  const exportCols: ExportColumn[] = [
    { key: "account_number", label: "Account #" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "zip_code", label: "ZIP" },
    { key: "plan_name", label: "Plan" },
    { key: "service_status", label: "Status" },
    { key: "source", label: "Source" },
  ];

  const exportRows = filtered.map(s => ({ ...s, name: [s.first_name, s.last_name].filter(Boolean).join(" ") }));

  const availableIntegrations = [
    { name: "NISC", providerType: "nisc", description: "National Information Solutions Cooperative — sync subscribers from your NISC billing system." },
    { name: "GLDS", providerType: "glds", description: "GLDS billing system integration for subscriber data synchronization." },
    { name: "FGN Academy", providerType: "fgn_academy", description: "FGN Academy LMS — automatically sync challenge completions, points, and player progress to fgn.academy." },
    { name: "manage.fgn.gg", providerType: "manage_fgn", description: "Fiber Gaming Network management portal — centralized subscriber verification and access codes.", comingSoon: true },
    { name: "hub.fgn.gg", providerType: "hub_fgn", description: "FGN Partner Hub — creative assets, marketing collateral, web pages, and brand kits.", comingSoon: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Subscribers</h1>
        <p className="text-muted-foreground">Manage subscriber records for your service area</p>
      </div>

      <div className="flex gap-4">
        <div className="bg-card border rounded-lg px-4 py-3 text-center min-w-[100px]">
          <p className="text-2xl font-bold">{counts.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border rounded-lg px-4 py-3 text-center min-w-[100px]">
          <p className="text-2xl font-bold text-green-600">{counts.active}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border rounded-lg px-4 py-3 text-center min-w-[100px]">
          <p className="text-2xl font-bold text-muted-foreground">{counts.inactive}</p>
          <p className="text-xs text-muted-foreground">Inactive</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscribers" className="gap-2"><Users className="h-4 w-4" /> Subscribers</TabsTrigger>
          <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" /> Upload</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><Plug className="h-4 w-4" /> Integrations</TabsTrigger>
          <TabsTrigger value="sync-history" className="gap-2"><History className="h-4 w-4" /> Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, account..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportTableCSV(exportRows, exportCols, "subscribers.csv")}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportTablePDF(exportRows, exportCols, "Subscribers")}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {subscribers.length === 0 ? "No subscribers yet. Upload a CSV or add them manually." : "No subscribers match your search."}
            </div>
          ) : (
            <>
              <div className="overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Account #</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>ZIP</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      {isAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubs.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{[sub.first_name, sub.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell>{sub.account_number || "—"}</TableCell>
                        <TableCell>{sub.email || "—"}</TableCell>
                        <TableCell>{sub.zip_code || "—"}</TableCell>
                        <TableCell>{sub.plan_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor[sub.service_status || "inactive"] || ""}>{sub.service_status || "unknown"}</Badge>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{sub.source || "manual"}</Badge></TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSub(sub)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteSub(sub)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {subTotalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setSubPage((p) => Math.max(1, p - 1))} className={subPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                    {Array.from({ length: subTotalPages }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink isActive={p === subPage} onClick={() => setSubPage(p)} className="cursor-pointer">{p}</PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext onClick={() => setSubPage((p) => Math.min(subTotalPages, p + 1))} className={subPage === subTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="upload">
          {tenantId && <SubscriberUploader tenantId={tenantId} onImport={(rows) => bulkInsert.mutate(rows as any)} isImporting={bulkInsert.isPending} />}
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableIntegrations.map((integ) => {
              const configured = integrations.find((i) => i.provider_type === integ.providerType);
              return (
                <IntegrationConfigCard
                  key={integ.providerType}
                  name={integ.name}
                  providerType={integ.providerType}
                  description={integ.description}
                  comingSoon={integ.comingSoon}
                  isConfigured={!!configured}
                  lastSyncAt={configured?.last_sync_at}
                  lastSyncStatus={configured?.last_sync_status}
                  lastSyncMessage={configured?.last_sync_message}
                  onConfigure={
                    integ.providerType === "fgn_academy" && configured
                      ? undefined
                      : () => {
                          if (integ.providerType === "nisc" || integ.providerType === "glds") {
                            setSelectedIntegration(configured || null);
                            setSelectedProviderType(integ.providerType);
                            setConfigDialogOpen(true);
                          } else if (integ.providerType === "fgn_academy" && !configured && tenantId) {
                            saveIntegration.mutate({
                              tenant_id: tenantId,
                              provider_type: "fgn_academy",
                              display_name: "FGN Academy",
                              additional_config: {},
                            });
                          }
                        }
                  }
                  onSync={configured && integ.providerType !== "fgn_academy" ? () => triggerSync.mutate({ integrationId: configured.id, providerType: integ.providerType }) : undefined}
                  isSyncing={triggerSync.isPending}
                  onDisconnect={configured ? () => deleteIntegration.mutate(configured.id) : undefined}
                  isDisconnecting={deleteIntegration.isPending}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="sync-history">
          <SyncHistoryPanel logs={syncLogs} isLoading={syncLogsLoading} />
        </TabsContent>
      </Tabs>

      {tenantId && (
        <BillingConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          tenantId={tenantId}
          providerType={selectedProviderType}
          existing={selectedIntegration}
          onSave={(data) => { saveIntegration.mutate(data as any, { onSuccess: () => setConfigDialogOpen(false) }); }}
          onUpdate={(id, fields) => { updateIntegration.mutate({ id, ...fields } as any, { onSuccess: () => setConfigDialogOpen(false) }); }}
          onTestConnection={async (integrationId) => {
            const result = await triggerSync.mutateAsync({ integrationId, dryRun: true, providerType: selectedProviderType });
            return result;
          }}
          isSaving={saveIntegration.isPending || updateIntegration.isPending}
        />
      )}

      <EditSubscriberDialog
        open={!!editSub}
        onOpenChange={(open) => { if (!open) setEditSub(null); }}
        subscriber={editSub}
        onSave={(id, fields) => updateSubscriber.mutate({ id, fields }, { onSuccess: () => setEditSub(null) })}
        isSaving={updateSubscriber.isPending}
      />

      <ConfirmDialog
        open={!!deleteSub}
        onOpenChange={(open) => { if (!open) setDeleteSub(null); }}
        title="Delete Subscriber"
        description={`Remove ${[deleteSub?.first_name, deleteSub?.last_name].filter(Boolean).join(" ") || "this subscriber"} permanently?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deleteSub) deleteSubscriber.mutate(deleteSub.id, { onSuccess: () => setDeleteSub(null) }); }}
      />
    </div>
  );
};

export default TenantSubscribers;
