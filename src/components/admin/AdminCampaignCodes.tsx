import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CampaignLinkedCode {
  id: string;
  code: string;
  code_type: string;
  times_used: number;
  max_uses: number | null;
  is_active: boolean;
  tenant_name: string;
}

export default function AdminCampaignCodes({ campaignId }: { campaignId: string }) {
  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["admin-campaign-codes", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_codes" as any)
        .select("id, code, code_type, times_used, max_uses, is_active, tenant_id")
        .eq("campaign_id", campaignId);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch tenant names
      const tenantIds = [...new Set((data as any[]).map((c: any) => c.tenant_id))];
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name")
        .in("id", tenantIds);
      const nameMap = new Map((tenants ?? []).map((t: any) => [t.id, t.name]));

      return (data as any[]).map((c: any) => ({
        ...c,
        tenant_name: nameMap.get(c.tenant_id) ?? "Unknown",
      })) as CampaignLinkedCode[];
    },
  });

  if (isLoading || codes.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" /> Linked Promo Codes ({codes.length})
      </h3>
      <div className="flex flex-wrap gap-2">
        {codes.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm ${!c.is_active ? "opacity-50" : ""}`}
          >
            <code className="font-mono font-semibold text-foreground">{c.code}</code>
            <Badge variant="outline" className="text-[10px] capitalize">{c.code_type}</Badge>
            <span className="text-muted-foreground text-xs">{c.tenant_name}</span>
            <span className="text-muted-foreground text-xs">
              {c.times_used}{c.max_uses ? `/${c.max_uses}` : ""} used
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5"
              onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
