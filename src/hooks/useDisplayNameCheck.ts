import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDisplayNameCheck(displayName: string, enabled: boolean) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setStatus("idle");
      return;
    }

    setStatus("checking");

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("display_name", trimmed)
        .limit(1);

      setStatus(data && data.length > 0 ? "taken" : "available");
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [displayName, enabled]);

  return status;
}
