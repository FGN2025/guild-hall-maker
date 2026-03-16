import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TENANT_TIERS = {
  basic: {
    name: "Tenant Basic",
    price_id: "price_1TBT8jC4M1A6BcTPiyEyHu24",
    product_id: "prod_U9mi2XMZdwKSKC",
    price: 850,
  },
} as const;

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

export function useTenantBilling() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["tenant-subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-tenant-subscription");
      if (error) throw error;
      return data as SubscriptionStatus;
    },
    refetchInterval: 60_000,
  });

  const currentTier = subscription?.product_id
    ? Object.entries(TENANT_TIERS).find(([, t]) => t.product_id === subscription.product_id)?.[0] ?? null
    : null;

  const startCheckout = async (priceId: string) => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-tenant-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tenant-customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return {
    subscription,
    isLoading,
    currentTier,
    checkoutLoading,
    portalLoading,
    startCheckout,
    openPortal,
    refetch,
  };
}
