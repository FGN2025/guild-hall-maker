import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

interface Row {
  asset_id: string;
  universal_title: string | null;
  label: string;
  url: string;
  universal_published_at: string | null;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  adopted_asset_id: string | null;
  tenant_published: boolean | null;
  state: "not_adopted" | "adopted" | "published";
}

const STATE_COLOR: Record<Row["state"], string> = {
  not_adopted: "bg-muted text-muted-foreground",
  adopted: "bg-amber-500/20 text-amber-500",
  published: "bg-emerald-500/20 text-emerald-500",
};

export default function AdminUniversalAssets() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin_universal_matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_universal_asset_adoption_matrix" as any)
        .select("*");
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const { assets, tenants, byPair } = useMemo(() => {
    const assetMap = new Map<string, { asset_id: string; title: string; url: string }>();
    const tenantMap = new Map<string, { tenant_id: string; name: string }>();
    const pair: Record<string, Row> = {};
    for (const r of data ?? []) {
      assetMap.set(r.asset_id, { asset_id: r.asset_id, title: r.universal_title ?? r.label, url: r.url });
      tenantMap.set(r.tenant_id, { tenant_id: r.tenant_id, name: r.tenant_name });
      pair[`${r.asset_id}:${r.tenant_id}`] = r;
    }
    return {
      assets: Array.from(assetMap.values()),
      tenants: Array.from(tenantMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      byPair: pair,
    };
  }, [data]);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-full space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Universal Asset Adoption</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adoption state per tenant across every universal marketing asset.
        </p>
      </div>

      {assets.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No universal assets published yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-lg font-heading">Adoption matrix</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 sticky left-0 bg-card">Asset</th>
                  {tenants.map((t) => (
                    <th key={t.tenant_id} className="text-left p-2 whitespace-nowrap">{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.asset_id} className="border-b border-border">
                    <td className="p-2 sticky left-0 bg-card">
                      <div className="flex items-center gap-2">
                        <img src={a.url} alt="" className="h-10 w-10 object-cover rounded" />
                        <span className="font-medium">{a.title}</span>
                      </div>
                    </td>
                    {tenants.map((t) => {
                      const cell = byPair[`${a.asset_id}:${t.tenant_id}`];
                      const state = cell?.state ?? "not_adopted";
                      return (
                        <td key={t.tenant_id} className="p-2">
                          <Badge className={STATE_COLOR[state]} variant="outline">
                            {state.replace("_", " ")}
                          </Badge>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
