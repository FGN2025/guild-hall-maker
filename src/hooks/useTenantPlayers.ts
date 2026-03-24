import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface UnifiedPlayer {
  id: string;
  source: "new" | "legacy";
  name: string;
  gamerTag: string | null;
  email: string | null;
  address: string | null;
  zip: string | null;
  inviteCode: string | null;
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
      const { data: profiles } = await (supabase.from as any)("profiles_public")
        .select("user_id, display_name, gamer_tag")
        .in("user_id", userIds);

      const pMap = new Map(((profiles || []) as any[]).map((p: any) => [p.user_id, p]));

      return data.map((row: any): UnifiedPlayer => {
        const p = pMap.get(row.user_id);
        return {
          id: row.id,
          source: "new",
          name: p?.display_name || "—",
          gamerTag: p?.gamer_tag || null,
          email: null,
          address: null,
          zip: row.zip_code,
          inviteCode: null,
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
        .select("id, legacy_username, email, first_name, last_name, address, zip_code, invite_code, status, matched_user_id, created_at")
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
        address: row.address || null,
        zip: row.zip_code,
        inviteCode: row.invite_code || null,
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
        (p.inviteCode && p.inviteCode.toLowerCase().includes(q))
    );
  }, [allPlayers, search]);

  const stats = useMemo(() => {
    const newCount = (leadsQuery.data || []).length;
    const legacyCount = (legacyQuery.data || []).length;
    const matched = (legacyQuery.data || []).filter((p) => p.matchedUserId).length;
    return { total: newCount + legacyCount, newCount, legacyCount, matched };
  }, [leadsQuery.data, legacyQuery.data]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateLegacyPlayer = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Record<string, string> }) => {
      const { error } = await (supabase as any).from("legacy_users").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-players-legacy", tenantId] });
      toast({ title: "Player updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error updating player", description: err.message, variant: "destructive" });
    },
  });

  const deleteLegacyPlayer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("legacy_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-players-legacy", tenantId] });
      toast({ title: "Legacy player removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting player", description: err.message, variant: "destructive" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_service_interests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-players-new", tenantId] });
      toast({ title: "Lead removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting lead", description: err.message, variant: "destructive" });
    },
  });

  const banPlayer = useMutation({
    mutationFn: async ({ email, reason }: { email: string; reason?: string }) => {
      const { error } = await supabase.from("banned_users").insert({
        email,
        reason: reason || "Banned by tenant admin",
        banned_by: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Player banned" });
    },
    onError: (err: Error) => {
      toast({ title: "Error banning player", description: err.message, variant: "destructive" });
    },
  });

  return {
    players: filtered,
    stats,
    search,
    setSearch,
    isLoading: leadsQuery.isLoading || legacyQuery.isLoading,
    updateLegacyPlayer,
    deleteLegacyPlayer,
    deleteLead,
    banPlayer,
  };
}
