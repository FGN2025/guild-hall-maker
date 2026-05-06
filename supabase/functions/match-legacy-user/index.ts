import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    // Use service role to query and update legacy_users (RLS = admin only)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let userId: string | null = null;
    let email: string | null = null;

    // Try to resolve the user from the JWT first (only if it looks like a real JWT, not the anon key)
    if (
      authHeader &&
      authHeader.startsWith("Bearer ey") &&
      authHeader !== `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
    ) {
      try {
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data } = await anonClient.auth.getUser();
        if (data?.user) {
          userId = data.user.id;
          email = data.user.email?.toLowerCase() ?? null;
        }
      } catch {
        // JWT introspection failed — fall through to body
      }
    }

    // Fallback: accept email and user_id from the request body
    if (!email) {
      try {
        const body = await req.json();
        email = body.email?.toLowerCase() ?? null;
        userId = body.user_id ?? userId;
      } catch {
        // no body
      }
    }

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ matched: false, reason: "no_email_or_user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find unmatched legacy user by email (include tenant + zip for player↔tenant link)
    const { data: legacyUser } = await adminClient
      .from("legacy_users")
      .select("id, legacy_username, tenant_id, zip_code")
      .ilike("email", email)
      .is("matched_user_id", null)
      .limit(1)
      .maybeSingle();

    if (!legacyUser) {
      return new Response(
        JSON.stringify({ matched: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark legacy user as matched
    await adminClient
      .from("legacy_users")
      .update({ matched_user_id: userId, matched_at: new Date().toISOString() })
      .eq("id", legacyUser.id);

    // Set gamer_tag on profile from legacy username
    await adminClient
      .from("profiles")
      .update({ gamer_tag: legacyUser.legacy_username })
      .eq("user_id", userId);

    // Create durable player↔tenant link so they don't need to "register" again
    // for each event. Idempotent via unique (user_id, tenant_id) index.
    if (legacyUser.tenant_id) {
      const { error: linkErr } = await adminClient
        .from("user_service_interests")
        .upsert(
          {
            user_id: userId,
            tenant_id: legacyUser.tenant_id,
            zip_code: legacyUser.zip_code ?? "",
            status: "legacy",
          },
          { onConflict: "user_id,tenant_id" }
        );
      if (linkErr) {
        console.error("match-legacy-user: failed to upsert tenant link", linkErr);
      }
    }

    return new Response(
      JSON.stringify({
        matched: true,
        legacy_username: legacyUser.legacy_username,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
