import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useChallengeEnrollment = (challengeId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ["challenge-enrollment", challengeId, user?.id],
    enabled: !!challengeId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_enrollments")
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ["challenge-evidence", enrollment?.id],
    enabled: !!enrollment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_evidence")
        .select("*")
        .eq("enrollment_id", enrollment!.id)
        .order("submitted_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user || !challengeId) throw new Error("Missing data");
      const { error } = await supabase.from("challenge_enrollments").insert({
        challenge_id: challengeId,
        user_id: user.id,
        status: "enrolled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-enrollment", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenge-enrollment-counts"] });
      toast.success("Enrolled in challenge!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: async ({ taskId, fileUrl, fileType, notes }: { taskId?: string; fileUrl: string; fileType: string; notes?: string }) => {
      if (!enrollment) throw new Error("Not enrolled");
      const { error } = await supabase.from("challenge_evidence").insert({
        enrollment_id: enrollment.id,
        task_id: taskId || null,
        file_url: fileUrl,
        file_type: fileType,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-evidence", enrollment?.id] });
      toast.success("Evidence submitted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      if (!enrollment) throw new Error("Not enrolled");
      const { error } = await supabase
        .from("challenge_enrollments")
        .update({ status: "submitted", updated_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-enrollment", challengeId] });
      toast.success("Submitted for review!");
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
  };
};
