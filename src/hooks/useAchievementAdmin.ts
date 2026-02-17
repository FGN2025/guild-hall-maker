import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  category: string;
  auto_criteria: Record<string, unknown> | null;
  max_progress: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlayerAchievementRow {
  id: string;
  user_id: string;
  achievement_id: string;
  awarded_at: string;
  awarded_by: string | null;
  progress: number | null;
  notes: string | null;
}

export interface RecentAward extends PlayerAchievementRow {
  display_name: string | null;
  avatar_url: string | null;
}

export const useAchievementDefinitions = () =>
  useQuery({
    queryKey: ["achievement-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievement_definitions")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as AchievementDefinition[];
    },
  });

export const useAchievementAdmin = () => {
  const qc = useQueryClient();

  const createDef = useMutation({
    mutationFn: async (def: Partial<AchievementDefinition>) => {
      const { error } = await supabase.from("achievement_definitions").insert(def as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["achievement-definitions"] });
      toast.success("Achievement created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDef = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<AchievementDefinition> & { id: string }) => {
      const { error } = await supabase.from("achievement_definitions").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["achievement-definitions"] });
      toast.success("Achievement updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDef = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("achievement_definitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["achievement-definitions"] });
      toast.success("Achievement deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const awardAchievement = useMutation({
    mutationFn: async (params: { user_id: string; achievement_id: string; notes?: string; awarded_by: string }) => {
      const row: Record<string, unknown> = {
        user_id: params.user_id,
        achievement_id: params.achievement_id,
        awarded_by: params.awarded_by,
      };
      // Only include notes if provided so upsert doesn't overwrite existing notes with null
      if (params.notes && params.notes.trim().length > 0) {
        row.notes = params.notes.trim();
      }
      const { error } = await supabase.from("player_achievements").upsert(row as any, { onConflict: "user_id,achievement_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recent-awards"] });
      qc.invalidateQueries({ queryKey: ["player-achievements"] });
      qc.invalidateQueries({ queryKey: ["global-achievements"] });
      toast.success("Achievement awarded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkAwardAchievement = useMutation({
    mutationFn: async (params: { user_ids: string[]; achievement_id: string; notes?: string; awarded_by: string }) => {
      const hasNotes = params.notes && params.notes.trim().length > 0;
      const rows = params.user_ids.map((uid) => {
        const row: Record<string, unknown> = {
          user_id: uid,
          achievement_id: params.achievement_id,
          awarded_by: params.awarded_by,
        };
        if (hasNotes) row.notes = params.notes!.trim();
        return row;
      });
      const { error } = await supabase.from("player_achievements").upsert(rows as any, { onConflict: "user_id,achievement_id" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recent-awards"] });
      qc.invalidateQueries({ queryKey: ["player-achievements"] });
      qc.invalidateQueries({ queryKey: ["global-achievements"] });
      toast.success(`Achievement awarded to ${vars.user_ids.length} player(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeAchievement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_achievements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recent-awards"] });
      qc.invalidateQueries({ queryKey: ["player-achievements"] });
      qc.invalidateQueries({ queryKey: ["global-achievements"] });
      toast.success("Achievement revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createDef, updateDef, deleteDef, awardAchievement, bulkAwardAchievement, revokeAchievement };
};

export const useRecentAwards = () =>
  useQuery({
    queryKey: ["recent-awards"],
    queryFn: async () => {
      const { data: awards, error } = await supabase
        .from("player_achievements")
        .select("*")
        .not("awarded_by", "is", null)
        .order("awarded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = awards as PlayerAchievementRow[];
      if (!rows.length) return [] as RecentAward[];

      // Batch-fetch profiles for all user_ids
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      );

      return rows.map((r) => {
        const profile = profileMap.get(r.user_id);
        return {
          ...r,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        } as RecentAward;
      });
    },
  });
