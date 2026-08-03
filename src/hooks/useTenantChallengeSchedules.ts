import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduledChallengeInfo {
  id: string;
  name: string;
  description: string | null;
  difficulty: string;
  points_first: number;
  points_second: number;
  points_third: number;
  points_participation: number;
  cover_image_url: string | null;
  games: { name: string; slug: string; cover_image_url: string | null } | null;
}

export interface TenantChallengeSchedule {
  id: string;
  tenant_id: string;
  challenge_id: string;
  starts_at: string;
  ends_at: string;
  headline: string | null;
  promo_copy: string | null;
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  challenges: ScheduledChallengeInfo | null;
}

export interface ScheduleInput {
  challenge_id: string;
  starts_at: string;
  ends_at: string;
  headline?: string | null;
  promo_copy?: string | null;
  is_featured?: boolean;
}

export type ScheduleStatus = "upcoming" | "open" | "closed";

export function scheduleStatus(s: Pick<TenantChallengeSchedule, "starts_at" | "ends_at">): ScheduleStatus {
  const now = Date.now();
  if (now < new Date(s.starts_at).getTime()) return "upcoming";
  if (now > new Date(s.ends_at).getTime()) return "closed";
  return "open";
}

const CHALLENGE_SELECT =
  "*, challenges(id, name, description, difficulty, points_first, points_second, points_third, points_participation, cover_image_url, games(name, slug, cover_image_url))";

/** Active platform challenge catalog — read-only source for tenant scheduling. */
export function useChallengeCatalog(enabled = true) {
  return useQuery({
    queryKey: ["challenge-catalog"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(
          "id, name, description, difficulty, points_first, points_second, points_third, points_participation, cover_image_url, games(name, slug, cover_image_url)",
        )
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ScheduledChallengeInfo[];
    },
  });
}

export function useTenantChallengeSchedules(tenantId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["tenant-challenge-schedules", tenantId];

  const schedulesQuery = useQuery({
    queryKey: key,
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_challenge_schedules" as any)
        .select(CHALLENGE_SELECT)
        .eq("tenant_id", tenantId!)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TenantChallengeSchedule[];
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (input: ScheduleInput) => {
      if (!tenantId) throw new Error("No tenant selected");
      const { data, error } = await supabase
        .from("tenant_challenge_schedules" as any)
        .insert({
          tenant_id: tenantId,
          challenge_id: input.challenge_id,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          headline: input.headline ?? null,
          promo_copy: input.promo_copy ?? null,
          is_featured: input.is_featured ?? false,
          created_by: user?.id ?? null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Schedule was blocked (0 rows returned).");
      return (data as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Challenge scheduled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleInput> & { id: string }) => {
      const { error } = await supabase
        .from("tenant_challenge_schedules" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Schedule updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_challenge_schedules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Schedule removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    schedules: schedulesQuery.data ?? [],
    isLoading: schedulesQuery.isLoading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
