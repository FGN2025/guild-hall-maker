import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "marketing" | "user";

/**
 * Fetches all roles for a given user from the user_roles table.
 * Returns the highest-privilege role and a boolean for admin status.
 */
export const useUserRole = (userId: string | undefined) => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
        setIsAdmin(false);
      } else if (data && data.length > 0) {
        const roles = data.map((r) => r.role as AppRole);
        // Return highest-privilege role
        const priority: AppRole[] = ["admin", "moderator", "marketing", "user"];
        const highest = priority.find((p) => roles.includes(p)) ?? roles[0];
        setRole(highest);
        setIsAdmin(roles.includes("admin"));
      } else {
        setRole(null);
        setIsAdmin(false);
      }
      setLoading(false);
    };

    fetchRole();
  }, [userId]);

  return { role, isAdmin, loading };
};
