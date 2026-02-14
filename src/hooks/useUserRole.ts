import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "user";

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
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
        setIsAdmin(false);
      } else if (data) {
        setRole(data.role as AppRole);
        setIsAdmin(data.role === "admin");
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
