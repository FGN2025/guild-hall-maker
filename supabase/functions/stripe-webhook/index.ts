import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR", { message: "Missing stripe-signature header" });
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { message: msg });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabaseAdmin, stripe, session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabaseAdmin, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseAdmin, subscription);
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Handle checkout.session.completed
 * Upserts tenant_subscriptions when a subscription checkout completes.
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  logStep("Handling checkout.session.completed", {
    sessionId: session.id,
    mode: session.mode,
    customerId: session.customer,
  });

  // Only handle subscription checkouts
  if (session.mode !== "subscription" || !session.subscription) {
    logStep("Skipping non-subscription checkout");
    return;
  }

  const tenantId = session.metadata?.tenant_id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? "";

  // Fetch full subscription to get product/price details
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const productId =
    typeof sub.items.data[0]?.price?.product === "string"
      ? sub.items.data[0].price.product
      : null;
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  // Determine if this is a tenant subscription or a cloud gaming seat
  const TENANT_BASIC_PRICE = "price_1TBT8jC4M1A6BcTPiyEyHu24";
  const CLOUD_SEAT_PRICE = "price_1TBT6ZC4M1A6BcTPCCEGAQp7";

  if (priceId === TENANT_BASIC_PRICE && tenantId) {
    // Upsert tenant subscription
    logStep("Upserting tenant subscription", { tenantId, subscriptionId });
    const { error } = await supabase
      .from("tenant_subscriptions")
      .upsert(
        {
          tenant_id: tenantId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          status: sub.status,
          price_id: priceId,
          product_id: productId,
          current_period_end: periodEnd,
        },
        { onConflict: "tenant_id" }
      );
    if (error) {
      logStep("Error upserting tenant_subscriptions", { error: error.message });
    } else {
      logStep("Tenant subscription upserted successfully");
      // Activate tenant on successful checkout
      const { error: activateErr } = await supabase
        .from("tenants")
        .update({ status: "active" })
        .eq("id", tenantId)
        .in("status", ["provisioning", "pending"]);
      if (activateErr) logStep("Error activating tenant", { error: activateErr.message });
      else logStep("Tenant activated", { tenantId });
    }
  } else if (priceId === CLOUD_SEAT_PRICE && tenantId) {
    // Update cloud gaming purchase record
    logStep("Updating cloud gaming purchase", { tenantId, subscriptionId });
    const { error } = await supabase
      .from("subscriber_cloud_purchases")
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
      })
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) logStep("Error updating cloud purchase", { error: error.message });
    else logStep("Cloud gaming purchase updated");
  } else {
    logStep("No matching price rule for checkout", { priceId, tenantId });
  }
}

/**
 * Handle customer.subscription.updated
 * Syncs status changes (active → past_due, etc.) to local tables.
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  logStep("Handling subscription.updated", { subscriptionId, status });

  // Try tenant_subscriptions first
  const { data: tenantSub, error: tErr } = await supabase
    .from("tenant_subscriptions")
    .update({
      status,
      current_period_end: periodEnd,
    })
    .eq("stripe_subscription_id", subscriptionId)
    .select("id")
    .maybeSingle();

  if (tErr) logStep("Error updating tenant_subscriptions", { error: tErr.message });
  if (tenantSub) {
    logStep("Tenant subscription updated", { id: tenantSub.id, status });
    return;
  }

  // Try cloud gaming purchases
  const { data: cloudPurchase, error: cErr } = await supabase
    .from("subscriber_cloud_purchases")
    .update({ status })
    .eq("stripe_subscription_id", subscriptionId)
    .select("id")
    .maybeSingle();

  if (cErr) logStep("Error updating cloud purchase", { error: cErr.message });
  if (cloudPurchase) {
    logStep("Cloud gaming purchase updated", { id: cloudPurchase.id, status });
    return;
  }

  logStep("No matching record for subscription update", { subscriptionId });
}

/**
 * Handle customer.subscription.deleted
 * Marks subscriptions as canceled in local tables.
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const subscriptionId = subscription.id;
  logStep("Handling subscription.deleted", { subscriptionId });

  // Try tenant_subscriptions
  const { data: tenantSub, error: tErr } = await supabase
    .from("tenant_subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscriptionId)
    .select("id")
    .maybeSingle();

  if (tErr) logStep("Error canceling tenant_subscriptions", { error: tErr.message });
  if (tenantSub) {
    logStep("Tenant subscription canceled", { id: tenantSub.id });
    return;
  }

  // Try cloud gaming purchases — also deactivate the seat
  const { data: cloudPurchase, error: cErr } = await supabase
    .from("subscriber_cloud_purchases")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)
    .select("id, tenant_id, subscriber_id")
    .maybeSingle();

  if (cErr) logStep("Error canceling cloud purchase", { error: cErr.message });
  if (cloudPurchase) {
    logStep("Cloud gaming purchase canceled", { id: cloudPurchase.id });

    // Deactivate the corresponding seat
    const { error: seatErr } = await supabase
      .from("subscriber_cloud_access")
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq("tenant_id", cloudPurchase.tenant_id)
      .eq("subscriber_id", cloudPurchase.subscriber_id)
      .eq("is_active", true);

    if (seatErr) logStep("Error deactivating seat", { error: seatErr.message });
    else logStep("Cloud gaming seat deactivated");
    return;
  }

  logStep("No matching record for subscription deletion", { subscriptionId });
}
