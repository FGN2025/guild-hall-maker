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

export function useLegacyUsers() {
  return useQuery({
    queryKey: ["legacy-users"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legacy_users")
        .select("*")
        .order("legacy_username", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data as LegacyUser[];
    },
  });
}

export function useLegacyUserStats() {
  return useQuery({
    queryKey: ["legacy-user-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legacy_users")
        .select("status, provider_name, matched_user_id");
      if (error) throw error;
      const users = data as Pick<LegacyUser, "status" | "provider_name" | "matched_user_id">[];
      const total = users.length;
      const matched = users.filter((u) => u.matched_user_id).length;
      const verified = users.filter((u) => u.status === "verified").length;
      const providerCounts: Record<string, number> = {};
      users.forEach((u) => {
        const p = u.provider_name || "Unknown";
        providerCounts[p] = (providerCounts[p] || 0) + 1;
      });
      return { total, matched, unmatched: total - matched, verified, providerCounts };
    },
  });
}
