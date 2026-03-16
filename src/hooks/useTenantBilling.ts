import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { STRIPE_PRODUCTS } from "@/lib/stripeProducts";
import { toast } from "sonner";

export function useTenantBilling() {
  const { tenantInfo } = useTenantAdmin();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tenantId = tenantInfo?.tenantId ?? null;

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["tenant-subscription", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isSubscribed = subscription?.status === "active" || subscription?.status === "trialing";

  const subscribe = async (priceId?: string) => {
    if (!tenantId) return;
    setActionLoading("subscribe");
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: priceId || STRIPE_PRODUCTS.tenant_basic.price_id,
          tenant_id: tenantId,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to create checkout session.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout.");
    } finally {
      setActionLoading(null);
    }
  };

  const managePortal = async () => {
    if (!tenantId) return;
    setActionLoading("portal");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to open billing portal.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open portal.");
    } finally {
      setActionLoading(null);
    }
  };

  const checkSubscription = async () => {
    if (!tenantId) return null;
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        body: { tenantId },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tenant-subscription", tenantId] });
      return data;
    } catch {
      return null;
    }
  };

  return {
    subscription,
    isSubscribed,
    isLoading,
    actionLoading,
    subscribe,
    managePortal,
    checkSubscription,
  };
}
