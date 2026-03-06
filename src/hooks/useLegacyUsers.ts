import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LegacyUser {
  id: string;
  legacy_username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  zip_code: string | null;
  discord_username: string | null;
  birthday: string | null;
  status: string;
  profile_completed: boolean;
  provider_name: string | null;
  tenant_id: string | null;
  invite_code: string | null;
  legacy_created_at: string | null;
  matched_user_id: string | null;
  matched_at: string | null;
  created_at: string;
}

export function useLegacyUsers(options?: { tenantId?: string; search?: string }) {
  const { tenantId, search } = options ?? {};
  return useQuery({
    queryKey: ["legacy-users", tenantId, search],
    queryFn: async () => {
      let query = (supabase as any)
        .from("legacy_users")
        .select("*")
        .order("legacy_username", { ascending: true });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      if (search) {
        query = query.or(
          `legacy_username.ilike.%${search}%,email.ilike.%${search}%,provider_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LegacyUser[];
    },
  });
}

export function useLegacyUserStats(tenantId?: string) {
  return useQuery({
    queryKey: ["legacy-user-stats", tenantId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("legacy_users")
        .select("status, provider_name, matched_user_id");

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      // Paginate to get all rows beyond the 1000 default limit
      const allRows: Pick<LegacyUser, "status" | "provider_name" | "matched_user_id">[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const total = allRows.length;
      const matched = allRows.filter((u) => u.matched_user_id).length;
      const verified = allRows.filter((u) => u.status === "verified").length;
      const providerCounts: Record<string, number> = {};
      allRows.forEach((u) => {
        const p = u.provider_name || "Unknown";
        providerCounts[p] = (providerCounts[p] || 0) + 1;
      });
      return { total, matched, unmatched: total - matched, verified, providerCounts };
    },
  });
}
