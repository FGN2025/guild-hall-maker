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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const {
      data: { user },
      error: userErr,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to query and update legacy_users (RLS = admin only)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const email = user.email?.toLowerCase();
    if (!email) {
      return new Response(
        JSON.stringify({ matched: false, reason: "no_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find unmatched legacy user by email
    const { data: legacyUser } = await adminClient
      .from("legacy_users")
      .select("id, legacy_username")
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
      .update({ matched_user_id: user.id, matched_at: new Date().toISOString() })
      .eq("id", legacyUser.id);

    // Set gamer_tag on profile from legacy username
    await adminClient
      .from("profiles")
      .update({ gamer_tag: legacyUser.legacy_username })
      .eq("user_id", user.id);

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
