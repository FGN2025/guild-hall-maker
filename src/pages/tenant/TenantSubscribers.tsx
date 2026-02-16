import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Upload, Plug } from "lucide-react";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useTenantSubscribers } from "@/hooks/useTenantSubscribers";
import { useTenantIntegrations } from "@/hooks/useTenantIntegrations";
import SubscriberUploader from "@/components/tenant/SubscriberUploader";
import IntegrationConfigCard from "@/components/tenant/IntegrationConfigCard";

const statusColor: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/30",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
};

const TenantSubscribers = () => {
  const { tenantInfo } = useTenantAdmin();
  const tenantId = tenantInfo?.tenantId;
  const { subscribers, isLoading, bulkInsert } = useTenantSubscribers(tenantId);
  const { integrations } = useTenantIntegrations(tenantId);
  const [search, setSearch] = useState("");

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

  const counts = {
    total: subscribers.length,
    active: subscribers.filter((s) => s.service_status === "active").length,
    inactive: subscribers.filter((s) => s.service_status !== "active").length,
  };

  const availableIntegrations = [
    {
      name: "NISC",
      providerType: "nisc",
      description: "National Information Solutions Cooperative — sync subscribers from your NISC billing system.",
    },
    {
      name: "GLDS",
      providerType: "glds",
      description: "GLDS billing system integration for subscriber data synchronization.",
    },
    {
      name: "manage.fgn.gg",
      providerType: "manage_fgn",
      description: "Fiber Gaming Network management portal — centralized subscriber verification and access codes.",
      comingSoon: true,
    },
    {
      name: "hub.fgn.gg",
      providerType: "hub_fgn",
      description: "FGN Partner Hub — creative assets, marketing collateral, web pages, and brand kits.",
      comingSoon: true,
    },
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

      <Tabs defaultValue="subscribers">
        <TabsList>
          <TabsTrigger value="subscribers" className="gap-2">
            <Users className="h-4 w-4" /> Subscribers
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" /> Upload
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" /> Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {subscribers.length === 0
                ? "No subscribers yet. Upload a CSV or add them manually."
                : "No subscribers match your search."}
            </div>
          ) : (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {[sub.first_name, sub.last_name].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell>{sub.account_number || "—"}</TableCell>
                      <TableCell>{sub.email || "—"}</TableCell>
                      <TableCell>{sub.zip_code || "—"}</TableCell>
                      <TableCell>{sub.plan_name || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColor[sub.service_status || "inactive"] || ""}
                        >
                          {sub.service_status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{sub.source || "manual"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload">
          {tenantId && (
            <SubscriberUploader
              tenantId={tenantId}
              onImport={(rows) => bulkInsert.mutate(rows as any)}
              isImporting={bulkInsert.isPending}
            />
          )}
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
                />
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantSubscribers;
