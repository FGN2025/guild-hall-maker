import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TenantSubscriber {
  id: string;
  tenant_id: string;
  account_number: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip_code: string | null;
  service_status: string | null;
  plan_name: string | null;
  source: string | null;
  external_id: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useTenantSubscribers = (tenantId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ["tenant-subscribers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_subscribers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TenantSubscriber[];
    },
    enabled: !!tenantId,
  });

  const addSubscriber = useMutation({
    mutationFn: async (sub: Omit<TenantSubscriber, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("tenant_subscribers").insert(sub);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-subscribers", tenantId] });
      toast({ title: "Subscriber added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error adding subscriber", description: err.message, variant: "destructive" });
    },
  });

  const bulkInsert = useMutation({
    mutationFn: async (rows: Omit<TenantSubscriber, "id" | "created_at" | "updated_at">[]) => {
      const { error } = await supabase.from("tenant_subscribers").upsert(rows, {
        onConflict: "tenant_id,source,external_id",
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-subscribers", tenantId] });
      toast({ title: `${variables.length} subscribers imported` });
    },
    onError: (err: Error) => {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    },
  });

  const updateSubscriber = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<TenantSubscriber> }) => {
      const { error } = await supabase.from("tenant_subscribers").update(fields as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-subscribers", tenantId] });
      toast({ title: "Subscriber updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error updating subscriber", description: err.message, variant: "destructive" });
    },
  });

  const deleteSubscriber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-subscribers", tenantId] });
      toast({ title: "Subscriber removed" });
    },
  });

  return { subscribers, isLoading, addSubscriber, bulkInsert, updateSubscriber, deleteSubscriber };
};
