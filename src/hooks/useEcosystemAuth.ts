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

      if (res.error || !res.data?.magicLink) {
        const msg = res.error?.message || "Failed to generate magic link";
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }

      window.open(res.data.magicLink, "_blank");

      toast({
        title: `Opening ${APP_LABELS[target]}...`,
        description: "A new tab should open shortly.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return { requestMagicLink, loading };
}
