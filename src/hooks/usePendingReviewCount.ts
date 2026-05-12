import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Number of challenge enrollments awaiting moderator/admin review
 * (status = 'submitted'). Returns 0 for non-staff users without firing a query.
 */
export const usePendingReviewCount = () => {
  const { isAdmin, isModerator } = useAuth();
  const isStaff = isAdmin || isModerator;

  return useQuery({
    queryKey: ["pending-review-count"],
    enabled: isStaff,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("challenge_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted");
      if (error) throw error;
      return count ?? 0;
    },
  });
};
