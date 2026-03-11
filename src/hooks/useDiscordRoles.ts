import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed?: boolean;
}

export const useDiscordRoles = (shouldFetch: boolean) => {
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("discord-server-roles")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && Array.isArray(data?.roles)) {
          // Filter out @everyone and bot-managed roles, sort by position desc
          setRoles(
            (data.roles as DiscordRole[])
              .filter((r) => r.name !== "@everyone" && !r.managed)
              .sort((a, b) => b.position - a.position)
          );
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [shouldFetch]);

  return { roles, loading };
};
