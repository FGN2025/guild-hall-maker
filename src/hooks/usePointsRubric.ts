import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_RUBRIC, type PointsRubric } from "@/lib/pointsRubric";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const RUBRIC_KEY = "points_rubric_config";

export const usePointsRubric = () => {
  return useQuery({
    queryKey: ["points-rubric"],
    queryFn: async (): Promise<PointsRubric> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", RUBRIC_KEY)
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return DEFAULT_RUBRIC;
      try {
        return { ...DEFAULT_RUBRIC, ...JSON.parse(data.value) } as PointsRubric;
      } catch {
        return DEFAULT_RUBRIC;
      }
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useUpdatePointsRubric = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ rubric, note }: { rubric: PointsRubric; note?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", RUBRIC_KEY)
        .maybeSingle();

      const previous = existing?.value ? JSON.parse(existing.value) : null;

      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { key: RUBRIC_KEY, value: JSON.stringify(rubric), description: "Central points rubric" },
          { onConflict: "key" },
        );
      if (error) throw error;

      await supabase.from("points_rubric_audit").insert({
        changed_by: user.id,
        previous_value: previous,
        new_value: rubric as any,
        note: note ?? null,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points-rubric"] });
      qc.invalidateQueries({ queryKey: ["points-rubric-audit"] });
      toast.success("Points rubric updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update rubric"),
  });
};

export const useRubricAuditLog = () => {
  return useQuery({
    queryKey: ["points-rubric-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_rubric_audit")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useRealignmentLog = () => {
  return useQuery({
    queryKey: ["points-realignment-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_realignment_log")
        .select("*")
        .order("performed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
};
