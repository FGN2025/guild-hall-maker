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
  console.log(`[PROVISION-TENANT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { orgName, email, password, displayName } = await req.json();

    // Validate inputs
    if (!orgName?.trim() || !email?.trim() || !password || !displayName?.trim()) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Starting provision", { orgName, email });

    // Check if email is banned
    const { data: banned } = await supabaseAdmin
      .from("banned_users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (banned) {
      return new Response(
        JSON.stringify({ error: "This email address is not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate slug from org name
    let baseSlug = orgName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);

    // Ensure slug uniqueness
    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    logStep("Generated slug", { slug });

    // Create or find auth user
    let userId: string;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    if (existingUser) {
      userId = existingUser.id;
      logStep("Using existing auth user", { userId });
    } else {
      const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: false,
        user_metadata: { display_name: displayName.trim() },
      });
      if (authErr) {
        logStep("Auth user creation failed", { error: authErr.message });
        return new Response(
          JSON.stringify({ error: authErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = newUser.user.id;
      logStep("Created auth user", { userId });
    }

    // Create tenant
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: orgName.trim(),
        slug,
        contact_email: email.trim(),
        status: "provisioning",
      })
      .select("id")
      .single();

    if (tenantErr) {
      logStep("Tenant creation failed", { error: tenantErr.message });
      return new Response(
        JSON.stringify({ error: "Failed to create organization: " + tenantErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Created tenant", { tenantId: tenant.id });

    // Assign as tenant admin
    const { error: adminErr } = await supabaseAdmin
      .from("tenant_admins")
      .insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: "admin",
      });

    if (adminErr) {
      logStep("Tenant admin assignment failed", { error: adminErr.message });
    }

    // Create Stripe checkout session
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const TENANT_BASIC_PRICE = "price_1TBT8jC4M1A6BcTPiyEyHu24";
    const origin = req.headers.get("origin") || "https://guild-hall-maker.lovable.app";

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: email.trim(), limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: email.trim(),
        name: orgName.trim(),
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: TENANT_BASIC_PRICE, quantity: 1 }],
      mode: "subscription",
      metadata: { tenant_id: tenant.id },
      success_url: `${origin}/tenant/settings?checkout=success`,
      cancel_url: `${origin}/for-providers?checkout=canceled`,
    });

    logStep("Stripe checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
