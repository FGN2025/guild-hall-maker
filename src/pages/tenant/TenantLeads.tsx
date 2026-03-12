import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useTenantLeads } from "@/hooks/useTenantLeads";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { exportTableCSV, exportTablePDF, type ExportColumn } from "@/lib/exportUserData";

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
];

const TenantLeads = () => {
  const { tenantInfo } = useTenantAdmin();
  const { leads, isLoading, updateLeadStatus } = useTenantLeads(tenantInfo?.tenantId || null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Users who matched your service area during registration.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No leads yet. They'll appear as users register with ZIP codes in your service area.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-heading">User</th>
                <th className="text-left p-3 font-heading">Gamer Tag</th>
                <th className="text-left p-3 font-heading">ZIP Code</th>
                <th className="text-center p-3 font-heading">Status</th>
                <th className="text-right p-3 font-heading">Registered</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="p-3 font-heading text-foreground">
                    {lead.profile?.display_name || "Unknown"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {lead.profile?.gamer_tag || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{lead.zip_code}</td>
                  <td className="p-3 text-center">
                    <Select
                      value={lead.status}
                      onValueChange={(value) =>
                        updateLeadStatus.mutate({ leadId: lead.id, status: value })
                      }
                    >
                      <SelectTrigger className="w-[130px] mx-auto h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right text-muted-foreground text-xs">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TenantLeads;
