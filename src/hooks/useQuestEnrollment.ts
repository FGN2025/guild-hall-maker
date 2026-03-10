import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useQuestEnrollment = (questId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ["quest-enrollment", questId, user?.id],
    enabled: !!questId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_enrollments")
        .select("*")
        .eq("quest_id", questId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ["quest-evidence", enrollment?.id],
    enabled: !!enrollment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_evidence")
        .select("*")
        .eq("enrollment_id", enrollment!.id)
        .order("submitted_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user || !questId) throw new Error("Missing data");
      const { error } = await supabase.from("quest_enrollments").insert({
        quest_id: questId,
        user_id: user.id,
        status: "enrolled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quest-enrollment", questId] });
      queryClient.invalidateQueries({ queryKey: ["quest-enrollment-counts"] });
      toast.success("Enrolled in quest!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: async ({ taskId, fileUrl, fileType, notes }: { taskId?: string; fileUrl: string; fileType: string; notes?: string }) => {
      if (!enrollment) throw new Error("Not enrolled");
      const { error } = await supabase.from("quest_evidence").insert({
        enrollment_id: enrollment.id,
        task_id: taskId || null,
        file_url: fileUrl,
        file_type: fileType,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quest-evidence", enrollment?.id] });
      toast.success("Evidence submitted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      if (!enrollment) throw new Error("Not enrolled");
      const { error } = await supabase
        .from("quest_enrollments")
        .update({ status: "submitted", updated_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quest-enrollment", questId] });
      toast.success("Submitted for review!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEvidenceMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      const { error } = await supabase
        .from("quest_evidence")
        .delete()
        .eq("id", evidenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quest-evidence", enrollment?.id] });
      toast.success("Evidence removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    enrollment,
    evidence,
    enrollmentLoading,
    enroll: enrollMutation.mutate,
    enrolling: enrollMutation.isPending,
    submitEvidence: submitEvidenceMutation.mutateAsync,
    submittingEvidence: submitEvidenceMutation.isPending,
    submitForReview: submitForReviewMutation.mutate,
    submittingForReview: submitForReviewMutation.isPending,
    deleteEvidence: deleteEvidenceMutation.mutate,
    deletingEvidence: deleteEvidenceMutation.isPending,
  };
};
