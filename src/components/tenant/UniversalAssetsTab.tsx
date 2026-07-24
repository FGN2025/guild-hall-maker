import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UniversalAsset {
  id: string;
  url: string;
  label: string;
  universal_title: string | null;
  universal_campaign_context: string | null;
  usage_notes: string | null;
  universal_published_at: string | null;
}

export default function UniversalAssetsTab({ tenantId }: { tenantId: string | null }) {
  const qc = useQueryClient();

  const { data: assets, isLoading } = useQuery({
    queryKey: ["universal_assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_assets" as any)
        .select("id, url, label, universal_title, universal_campaign_context, usage_notes, universal_published_at")
        .eq("is_universal", true)
        .order("universal_published_at", { ascending: false });
      if (error) throw error;
      return data as unknown as UniversalAsset[];
    },
  });

  const { data: adopted } = useQuery({
    queryKey: ["tenant_adopted_universal", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_marketing_assets" as any)
        .select("id, source_asset_id")
        .eq("tenant_id", tenantId!)
        .not("source_asset_id", "is", null);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as any[]) {
        if (r.source_asset_id) map[r.source_asset_id] = r.id;
      }
      return map;
    },
  });

  const adopt = useMutation({
    mutationFn: async (asset_id: string) => {
      if (!tenantId) throw new Error("No tenant");
      const { data, error } = await supabase.functions.invoke("adopt-universal-asset", {
        body: { tenant_id: tenantId, asset_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["tenant_adopted_universal", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenant_marketing_assets", tenantId] });
      toast.success(data?.already_adopted ? "Already adopted" : "Adopted to My Assets");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to adopt"),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No universal marketing assets yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((a) => {
        const isAdopted = adopted?.[a.id];
        return (
          <Card key={a.id} className="overflow-hidden flex flex-col">
            <img src={a.url} alt={a.universal_title ?? a.label} className="w-full h-40 object-cover" />
            <CardContent className="pt-4 space-y-3 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="font-heading text-sm font-medium">{a.universal_title ?? a.label}</span>
                {isAdopted && <Badge variant="default">Adopted</Badge>}
              </div>
              {a.universal_campaign_context && (
                <p className="text-xs text-muted-foreground">{a.universal_campaign_context}</p>
              )}
              {a.usage_notes && (
                <p className="text-xs italic text-muted-foreground line-clamp-3">{a.usage_notes}</p>
              )}
              <div className="mt-auto">
                <Button
                  size="sm"
                  className="w-full"
                  disabled={adopt.isPending || !!isAdopted || !tenantId}
                  onClick={() => adopt.mutate(a.id)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isAdopted ? "Adopted" : adopt.isPending ? "Adopting..." : "Adopt"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
