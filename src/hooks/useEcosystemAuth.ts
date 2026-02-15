import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type TargetApp = "manage" | "hub";

const APP_LABELS: Record<TargetApp, string> = {
  manage: "FGN Manage",
  hub: "FGN Hub",
};

export function useEcosystemAuth() {
  const [loading, setLoading] = useState<TargetApp | null>(null);

  const requestMagicLink = async (target: TargetApp) => {
    setLoading(target);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast({ title: "Not authenticated", description: "Please log in first.", variant: "destructive" });
        return;
      }

      const res = await supabase.functions.invoke("ecosystem-magic-link", {
        body: { target },
      });

      if (res.error) {
        const msg = res.error.message || "Failed to send magic link";
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }

      toast({
        title: "Magic link sent!",
        description: `Check your email for a login link to ${APP_LABELS[target]}.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return { requestMagicLink, loading };
}
