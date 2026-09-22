import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MappingStatus = "matched" | "needs_review" | "legacy" | "retired" | "orphaned_source";

export interface SimulationActivity {
  id: string;
  canonical_name: string;
  canonical_slug: string;
  canonical_description: string | null;
  game_id: string;
  game_version: string | null;
  activity_category: string | null;
  industry_domain: string | null;
  status: "draft" | "active" | "retired";
  provenance: string;
  source_challenge_id: string | null;
  created_at: string;
  updated_at: string;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Canonical Simulation Activities (admin-only data; never used on player surfaces). */
export const useSimulationActivities = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["simulation-activities"] });
    queryClient.invalidateQueries({ queryKey: ["simulation-activity-mappings"] });
    queryClient.invalidateQueries({ queryKey: ["activity-mapping-challenges"] });
  };

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["simulation-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_activities")
        .select("*, games(name, slug)")
        .order("canonical_name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ["simulation-activity-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_activity_challenges")
        .select("*, simulation_activities(canonical_name)");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: challenges = [], isLoading: challengesLoading } = useQuery({
    queryKey: ["activity-mapping-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(
          "id, name, game_id, track, is_active, content_classification, simulation_activity_id, games(name), challenge_tasks(id, title, display_order)"
        )
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const emitEvent = async (id: string, event_type: string) => {
    try {
      await supabase.functions.invoke("simulation-activity-events", {
        body: { simulation_activity_id: id, event_type },
      });
    } catch (e) {
      console.warn("simulation activity event dispatch failed", e);
    }
  };

  const createActivity = useMutation({
    mutationFn: async (input: {
      canonical_name: string;
      canonical_description?: string | null;
      game_id: string;
      game_version?: string | null;
      activity_category?: string | null;
      industry_domain?: string | null;
      status?: "draft" | "active" | "retired";
      source_challenge_id?: string | null;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("simulation_activities")
        .insert({
          canonical_name: input.canonical_name,
          canonical_slug: slugify(input.canonical_name),
          canonical_description: input.canonical_description ?? null,
          game_id: input.game_id,
          game_version: input.game_version ?? null,
          activity_category: input.activity_category ?? null,
          industry_domain: input.industry_domain ?? null,
          status: input.status ?? "active",
          provenance: input.source_challenge_id ? "derived_from_challenge" : "manual",
          source_challenge_id: input.source_challenge_id ?? null,
          created_by: userRes?.user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      await emitEvent(data.id, "simulation_activity.created");
      return data as SimulationActivity;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Simulation activity created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SimulationActivity> & { id: string }) => {
      const { error } = await supabase.from("simulation_activities").update(patch as any).eq("id", id);
      if (error) throw error;
      await emitEvent(
        id,
        patch.status === "retired" ? "simulation_activity.retired" : "simulation_activity.updated"
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success("Activity updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /** Link a challenge to an activity as its primary (challenge-level) canonical mapping. */
  const linkChallenge = useMutation({
    mutationFn: async ({
      challengeId,
      activityId,
      mappingStatus = "matched",
      notes,
    }: {
      challengeId: string;
      activityId: string;
      mappingStatus?: MappingStatus;
      notes?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const existing = mappings.find(
        (m: any) => m.challenge_id === challengeId && m.challenge_task_id === null && m.is_primary
      );
      if (existing) {
        const { error } = await supabase
          .from("simulation_activity_challenges")
          .update({
            simulation_activity_id: activityId,
            mapping_status: mappingStatus,
            review_notes: notes ?? null,
            reviewed_by: userRes?.user?.id ?? null,
            reviewed_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("simulation_activity_challenges").insert({
        simulation_activity_id: activityId,
        challenge_id: challengeId,
        challenge_task_id: null,
        is_primary: true,
        mapping_status: mappingStatus,
        review_notes: notes ?? null,
        reviewed_by: userRes?.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Mapping saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unlinkChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from("simulation_activity_challenges")
        .delete()
        .eq("challenge_id", challengeId)
        .is("challenge_task_id", null);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Mapping removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setMappingStatus = useMutation({
    mutationFn: async ({ mappingId, status }: { mappingId: string; status: MappingStatus }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("simulation_activity_challenges")
        .update({
          mapping_status: status,
          reviewed_by: userRes?.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", mappingId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Mapping status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setClassification = useMutation({
    mutationFn: async ({
      challengeId,
      classification,
    }: {
      challengeId: string;
      classification: "simulation" | "entertainment_only" | null;
    }) => {
      const { error } = await supabase
        .from("challenges")
        .update({ content_classification: classification } as any)
        .eq("id", challengeId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Classification updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    activities,
    activitiesLoading,
    mappings,
    challenges,
    challengesLoading,
    createActivity,
    updateActivity,
    linkChallenge,
    unlinkChallenge,
    setMappingStatus,
    setClassification,
  };
};

/** Advisory-only name similarity suggestions. Never written to the canonical graph. */
export const suggestActivitiesForChallenge = (
  challenge: { name: string; game_id: string | null },
  activities: any[]
) => {
  const norm = (s: string) =>
    s.toLowerCase().replace(/^[a-z0-9]{2,6}\s+[a-z]+:\s*/i, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const target = new Set(norm(challenge.name));
  return activities
    .filter((a) => a.game_id === challenge.game_id && a.status !== "retired")
    .map((a) => {
      const words = norm(a.canonical_name);
      const hits = words.filter((w) => target.has(w)).length;
      return { activity: a, similarity: words.length ? hits / words.length : 0 };
    })
    .filter((s) => s.similarity >= 0.34)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
};
