import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TenantCode {
  id: string;
  tenant_id: string;
  code: string;
  description: string | null;
  code_type: string;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  is_active: boolean;
  campaign_id: string | null;
  created_by: string;
  created_at: string;
}

interface CreateCodeInput {
  code: string;
  description?: string;
  code_type: string;
  max_uses?: number | null;
  expires_at?: string | null;
  campaign_id?: string | null;
}

export function useTenantCodes(tenantId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["tenant-codes", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_codes" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TenantCode[];
    },
  });

  const createCode = useMutation({
    mutationFn: async (input: CreateCodeInput) => {
      const { error } = await supabase.from("tenant_codes" as any).insert({
        tenant_id: tenantId,
        code: input.code.trim().toUpperCase(),
        description: input.description || null,
        code_type: input.code_type,
        max_uses: input.max_uses ?? null,
        expires_at: input.expires_at || null,
        campaign_id: input.campaign_id || null,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-codes", tenantId] });
      toast.success("Code created.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCode = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_active?: boolean; description?: string }) => {
      const { error } = await supabase
        .from("tenant_codes" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-codes", tenantId] });
      toast.success("Code updated.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tenant_codes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-codes", tenantId] });
      toast.success("Code deleted.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { codes, isLoading, createCode, updateCode, deleteCode };
}
