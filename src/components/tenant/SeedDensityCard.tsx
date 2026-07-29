import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarRange, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Density = "light" | "standard" | "full";

const OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "One day-of post per event." },
  { value: "standard", label: "Standard", hint: "Announce plus day-of for each event." },
  { value: "full", label: "Full", hint: "Announce, countdown, day-of and recap." },
];

/** Per-tenant default used by the monthly calendar seed lane when the launcher
 *  does not override it for a single run. */
export default function SeedDensityCard({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<Density>("standard");

  const { data, isLoading } = useQuery({
    queryKey: ["tenant_seed_density", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants" as any)
        .select("marketing_seed_density")
        .eq("id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.marketing_seed_density ?? "standard") as Density;
    },
  });

  useEffect(() => {
    if (data) setValue(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (next: Density) => {
      const { data, error } = await supabase
        .from("tenants" as any)
        .update({ marketing_seed_density: next } as any)
        .eq("id", tenantId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Update was blocked (0 rows changed) — you may not have permission on this tenant.");
      }
    },
    onSuccess: () => {
      toast.success("Seed density saved");
      qc.invalidateQueries({ queryKey: ["tenant_seed_density", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-heading">
          <CalendarRange className="h-5 w-5 text-primary" /> Marketing seed density
        </CardTitle>
        <CardDescription>
          How many promo drafts a monthly calendar seed run creates for each event on your calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Default density</Label>
          <Select value={value} onValueChange={(v: Density) => setValue(v)} disabled={isLoading}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label} — {o.hint}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => save.mutate(value)} disabled={save.isPending || isLoading || value === data}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save density
        </Button>
      </CardContent>
    </Card>
  );
}
