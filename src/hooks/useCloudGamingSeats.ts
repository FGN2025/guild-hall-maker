import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantCloudGaming } from "@/hooks/useTenantCloudGaming";
import { useTenantSubscribers } from "@/hooks/useTenantSubscribers";
import { STRIPE_PRODUCTS } from "@/lib/stripeProducts";
import { toast } from "sonner";

export interface CloudGamingSeat {
  id: string;
  tenant_id: string;
  subscriber_id: string;
  user_id: string | null;
  is_active: boolean;
  activated_at: string;
  deactivated_at: string | null;
}

export interface CloudGamingPurchase {
  id: string;
  tenant_id: string;
  subscriber_id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
}

export const useCloudGamingSeats = (tenantId: string | undefined) => {
  const queryClient = useQueryClient();
  const { config } = useTenantCloudGaming(tenantId);
  const { subscribers } = useTenantSubscribers(tenantId);

  // Active seats
  const { data: seats = [], isLoading: seatsLoading } = useQuery({
    queryKey: ["cloud-gaming-seats", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriber_cloud_access")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("activated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CloudGamingSeat[];
    },
  });

  // Purchases
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["cloud-gaming-purchases", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriber_cloud_purchases")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CloudGamingPurchase[];
    },
  });

  // Subscribers not already assigned a seat
  const assignedSubscriberIds = new Set(seats.map((s) => s.subscriber_id));
  const availableSubscribers = subscribers.filter(
    (s) => !assignedSubscriberIds.has(s.id)
  );

  const maxSeats = config?.max_seats ?? 0;
  const availableSlots = Math.max(0, maxSeats - seats.length);

  // Assign seat
  const assignSeat = useMutation({
    mutationFn: async (subscriberId: string) => {
      if (availableSlots <= 0) throw new Error("No available seats");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert cloud access record
      const { error: accessErr } = await supabase
        .from("subscriber_cloud_access")
        .insert({
          tenant_id: tenantId!,
          subscriber_id: subscriberId,
          user_id: user.id,
          is_active: true,
        });
      if (accessErr) throw accessErr;

      // Insert purchase record
      const { error: purchaseErr } = await supabase
        .from("subscriber_cloud_purchases")
        .insert({
          tenant_id: tenantId!,
          subscriber_id: subscriberId,
          user_id: user.id,
          status: "pending",
        } as any);
      if (purchaseErr) throw purchaseErr;

      // Trigger Stripe checkout for the seat
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: STRIPE_PRODUCTS.cloud_gaming_seat.price_id,
          tenant_id: tenantId,
          mode: "subscription",
          success_url: `${window.location.origin}/tenant/settings?checkout=success`,
          cancel_url: `${window.location.origin}/tenant/settings?checkout=canceled`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloud-gaming-seats", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["cloud-gaming-purchases", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["cloud-gaming-seats-count", tenantId] });
      toast.success("Seat assigned successfully!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Revoke seat
  const revokeSeat = useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from("subscriber_cloud_access")
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq("id", accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloud-gaming-seats", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["cloud-gaming-seats-count", tenantId] });
      toast.success("Seat revoked");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    seats,
    purchases,
    isLoading: seatsLoading || purchasesLoading,
    assignSeat,
    revokeSeat,
    availableSlots,
    availableSubscribers,
    maxSeats,
  };
};
