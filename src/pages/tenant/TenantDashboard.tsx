import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useTenantLeads } from "@/hooks/useTenantLeads";
import { useTenantAchievements } from "@/hooks/useTenantAchievements";
import TenantAchievementsCard from "@/components/tenant/TenantAchievementsCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, MapPin, Clock, UserCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const TenantDashboard = () => {
  const { tenantInfo } = useTenantAdmin();
  const { leads } = useTenantLeads(tenantInfo?.tenantId || null);

  const { data: zipCount = 0 } = useQuery({
    queryKey: ["tenant-zip-count", tenantInfo?.tenantId],
    enabled: !!tenantInfo?.tenantId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tenant_zip_codes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantInfo!.tenantId);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: legacyCount = 0 } = useQuery({
    queryKey: ["tenant-legacy-count", tenantInfo?.tenantId],
    enabled: !!tenantInfo?.tenantId,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("legacy_users")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantInfo!.tenantId);
      if (error) throw error;
      return count || 0;
    },
  });

  const totalPlayers = leads.length + legacyCount;

  const { data: achievementPlayers = [], isLoading: achievementsLoading } = useTenantAchievements(tenantInfo?.tenantId ?? null);

  const stats = [
    { label: "Total Players", value: totalPlayers, icon: Users, color: "text-primary" },
    { label: "New Leads", value: leads.filter((l) => l.status === "new").length, icon: Clock, color: "text-yellow-400" },
    { label: "ZIP Codes Covered", value: zipCount, icon: MapPin, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview for {tenantInfo?.tenantName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-border rounded-lg p-5 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-heading">{s.label}</span>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="font-display text-3xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Navigation to Players */}
      <Link
        to="/tenant/players"
        className="flex items-center justify-between border border-border rounded-lg p-5 bg-card hover:bg-accent/50 transition-colors group"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Player Directory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all {totalPlayers} players ({legacyCount} legacy, {leads.length} new)
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>

      {/* Player Achievements */}
      <TenantAchievementsCard players={achievementPlayers} isLoading={achievementsLoading} />

      <div>
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Recent Leads</h2>
        {leads.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No leads yet. Users who match your service area during registration will appear here.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-heading">User</th>
                  <th className="text-left p-3 font-heading">ZIP Code</th>
                  <th className="text-center p-3 font-heading">Status</th>
                  <th className="text-right p-3 font-heading">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map((lead) => (
                  <tr key={lead.id} className="border-t border-border">
                    <td className="p-3 font-heading text-foreground">
                      {lead.profile?.display_name || lead.profile?.gamer_tag || "Unknown"}
                    </td>
                    <td className="p-3 text-muted-foreground">{lead.zip_code}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-heading ${
                          lead.status === "new"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : lead.status === "converted"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {lead.status}
                      </span>
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
    </div>
  );
};

export default TenantDashboard;
