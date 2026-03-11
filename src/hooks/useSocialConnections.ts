import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SocialConnection = {
  id: string;
  tenant_id: string | null;
  user_id: string;
  platform: string;
  account_name: string | null;
  page_id: string | null;
  is_active: boolean;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useSocialConnections(tenantId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["social_connections", tenantId, user?.id];

  const { data: connections = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("social_connections" as any)
        .select("id, tenant_id, user_id, platform, account_name, page_id, is_active, token_expires_at, created_at, updated_at")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SocialConnection[];
    },
  });

  const addConnection = useMutation({
    mutationFn: async (input: {
      platform: string;
      account_name: string;
      access_token: string;
      page_id?: string;
      refresh_token?: string;
      token_expires_at?: string;
    }) => {
      const { error } = await supabase.from("social_connections" as any).insert({
        user_id: user!.id,
        tenant_id: tenantId ?? null,
        platform: input.platform,
        account_name: input.account_name,
        access_token: input.access_token,
        page_id: input.page_id ?? null,
        refresh_token: input.refresh_token ?? null,
        token_expires_at: input.token_expires_at ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Account connected"); },
    onError: () => toast.error("Failed to connect account"),
  });

  const removeConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_connections" as any)
        .update({ is_active: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Account disconnected"); },
    onError: () => toast.error("Failed to disconnect"),
  });

  return { connections, isLoading, addConnection, removeConnection };
}
