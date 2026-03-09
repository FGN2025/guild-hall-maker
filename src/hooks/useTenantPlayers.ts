import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";

export interface UnifiedPlayer {
  id: string;
  source: "new" | "legacy";
  name: string;
  gamerTag: string | null;
  email: string | null;
  address: string | null;
  zip: string | null;
  status: string;
  matchedUserId: string | null;
  createdAt: string;
}

export function useTenantPlayers(tenantId: string | null) {
  const [search, setSearch] = useState("");

  const leadsQuery = useQuery({
    queryKey: ["tenant-players-new", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_service_interests")
        .select("id, user_id, zip_code, status, created_at")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      if (!data || data.length === 0) return [] as UnifiedPlayer[];

      const userIds = data.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, gamer_tag")
        .in("user_id", userIds);

      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return data.map((row: any): UnifiedPlayer => {
        const p = pMap.get(row.user_id);
        return {
          id: row.id,
          source: "new",
          name: p?.display_name || "—",
          gamerTag: p?.gamer_tag || null,
          email: null, // not stored in user_service_interests
          zip: row.zip_code,
          status: row.status || "new",
          matchedUserId: null,
          createdAt: row.created_at,
        };
      });
    },
  });

  const legacyQuery = useQuery({
    queryKey: ["tenant-players-legacy", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legacy_users")
        .select("id, legacy_username, email, first_name, last_name, address, zip_code, status, matched_user_id, created_at")
        .eq("tenant_id", tenantId!)
        .order("legacy_username", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data || []).map((row: any): UnifiedPlayer => ({
        id: row.id,
        source: "legacy",
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.legacy_username,
        gamerTag: row.legacy_username,
        email: row.email,
        zip: row.zip_code,
        status: row.matched_user_id ? "matched" : (row.status || "unknown"),
        matchedUserId: row.matched_user_id,
        createdAt: row.created_at,
      }));
    },
  });

  const allPlayers = useMemo(() => {
    return [...(leadsQuery.data || []), ...(legacyQuery.data || [])];
  }, [leadsQuery.data, legacyQuery.data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allPlayers;
    const q = search.toLowerCase();
    return allPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.gamerTag && p.gamerTag.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.zip && p.zip.includes(q))
    );
  }, [allPlayers, search]);

  const stats = useMemo(() => {
    const newCount = (leadsQuery.data || []).length;
    const legacyCount = (legacyQuery.data || []).length;
    const matched = (legacyQuery.data || []).filter((p) => p.matchedUserId).length;
    return { total: newCount + legacyCount, newCount, legacyCount, matched };
  }, [leadsQuery.data, legacyQuery.data]);

  return {
    players: filtered,
    stats,
    search,
    setSearch,
    isLoading: leadsQuery.isLoading || legacyQuery.isLoading,
  };
}
