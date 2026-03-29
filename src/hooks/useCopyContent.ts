import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useCopyContent = () => {
  const [copying, setCopying] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const copyToQuest = async (challengeId: string) => {
    if (!user) return;
    setCopying(true);
    try {
      const { data: challenge, error: cErr } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .single();
      if (cErr || !challenge) throw cErr || new Error("Challenge not found");

      const { data: tasks } = await supabase
        .from("challenge_tasks")
        .select("title, description, display_order")
        .eq("challenge_id", challengeId)
        .order("display_order");

      const { data: quest, error: qErr } = await supabase
        .from("quests")
        .insert({
          name: `${challenge.name} (Copy)`,
          description: challenge.description,
          difficulty: challenge.difficulty,
          game_id: challenge.game_id,
          points_first: challenge.points_first,
          points_reward: challenge.points_reward,
          estimated_minutes: challenge.estimated_minutes,
          requires_evidence: challenge.requires_evidence,
          cover_image_url: challenge.cover_image_url,
          achievement_id: challenge.achievement_id,
          is_active: false,
          created_by: user.id,
          xp_reward: 0,
        })
        .select("id")
        .single();
      if (qErr || !quest) throw qErr || new Error("Failed to create quest");

      if (tasks && tasks.length > 0) {
        const questTasks = tasks.map((t) => ({
          quest_id: quest.id,
          title: t.title,
          description: t.description,
          display_order: t.display_order,
        }));
        const { error: tErr } = await supabase.from("quest_tasks").insert(questTasks);
        if (tErr) throw tErr;
      }

      toast.success("Challenge copied to Quest (inactive)");
      navigate(`/quests/${quest.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to copy to quest");
    } finally {
      setCopying(false);
    }
  };

  const copyToChallenge = async (questId: string) => {
    if (!user) return;
    setCopying(true);
    try {
      const { data: quest, error: qErr } = await supabase
        .from("quests")
        .select("*")
        .eq("id", questId)
        .single();
      if (qErr || !quest) throw qErr || new Error("Quest not found");

      const { data: tasks } = await supabase
        .from("quest_tasks")
        .select("title, description, display_order")
        .eq("quest_id", questId)
        .order("display_order");

      const { data: challenge, error: cErr } = await supabase
        .from("challenges")
        .insert({
          name: `${quest.name} (Copy)`,
          description: quest.description,
          difficulty: quest.difficulty,
          game_id: quest.game_id,
          points_first: quest.points_first,
          points_reward: quest.points_reward,
          estimated_minutes: quest.estimated_minutes,
          requires_evidence: quest.requires_evidence,
          cover_image_url: quest.cover_image_url,
          achievement_id: quest.achievement_id,
          challenge_type: "one_time",
          is_active: false,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (cErr || !challenge) throw cErr || new Error("Failed to create challenge");

      if (tasks && tasks.length > 0) {
        const challengeTasks = tasks.map((t) => ({
          challenge_id: challenge.id,
          title: t.title,
          description: t.description,
          display_order: t.display_order,
        }));
        const { error: tErr } = await supabase.from("challenge_tasks").insert(challengeTasks);
        if (tErr) throw tErr;
      }

      toast.success("Quest copied to Challenge (inactive)");
      navigate(`/challenges/${challenge.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to copy to challenge");
    } finally {
      setCopying(false);
    }
  };

  return { copying, copyToQuest, copyToChallenge };
};
