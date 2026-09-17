import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/** Duplicate an existing challenge (with its tasks) as a new inactive challenge. */
export const useCopyContent = () => {
  const [copying, setCopying] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const duplicateChallenge = async (challengeId: string) => {
    if (!user) return;
    setCopying(true);
    try {
      const { data: source, error: cErr } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .single();
      if (cErr || !source) throw cErr || new Error("Challenge not found");

      const { data: tasks } = await supabase
        .from("challenge_tasks")
        .select("title, description, display_order")
        .eq("challenge_id", challengeId)
        .order("display_order");

      const { data: created, error: insErr } = await supabase
        .from("challenges")
        .insert({
          name: `${source.name} (Copy)`,
          description: source.description,
          difficulty: source.difficulty,
          game_id: source.game_id,
          points_first: source.points_first,
          points_reward: source.points_reward,
          estimated_minutes: source.estimated_minutes,
          requires_evidence: source.requires_evidence,
          cover_image_url: source.cover_image_url,
          achievement_id: source.achievement_id,
          challenge_type: source.challenge_type ?? "one_time",
          track: (source as any).track ?? null,
          is_active: false,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (insErr || !created) throw insErr || new Error("Failed to create challenge");

      if (tasks && tasks.length > 0) {
        const { error: tErr } = await supabase.from("challenge_tasks").insert(
          tasks.map((t) => ({
            challenge_id: created.id,
            title: t.title,
            description: t.description,
            display_order: t.display_order,
          }))
        );
        if (tErr) throw tErr;
      }

      toast.success("Challenge duplicated (inactive)");
      navigate(`/challenges/${created.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to duplicate challenge");
    } finally {
      setCopying(false);
    }
  };

  return { copying, duplicateChallenge };
};
