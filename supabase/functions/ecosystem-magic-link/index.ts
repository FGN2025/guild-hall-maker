import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TARGET_URLS: Record<string, string> = {
  manage: "https://manage.fgn.gg",
  hub: "https://hub.fgn.gg",
  play: "https://play.fgn.gg",
  academy: "https://fgn.academy",
  broadband: "https://broadbandworkforce.com",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    // Verify the user via their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email associated with account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { target } = await req.json();
    if (!target || !TARGET_URLS[target]) {
      return new Response(JSON.stringify({ error: "Invalid target app. Use 'manage' or 'hub'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for privileged queries
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user has admin/moderator role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const hasPrivilegedRole =
      roleData?.role === "admin" || roleData?.role === "moderator";

    // Check if user is a tenant admin
    let isTenantAdmin = false;
    if (!hasPrivilegedRole) {
      const { data: tenantAdminData } = await adminClient
        .from("tenant_admins")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      isTenantAdmin = !!tenantAdminData && tenantAdminData.length > 0;
    }

    if (!hasPrivilegedRole && !isTenantAdmin) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to access ecosystem apps." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate token and store it
    const { data: tokenRow, error: insertError } = await adminClient
      .from("ecosystem_auth_tokens")
      .insert({
        user_id: userId,
        email: userEmail,
        target_app: target,
      })
      .select("token")
      .single();

    if (insertError || !tokenRow) {
      console.error("Token insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to generate auth token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const magicLinkUrl = `${TARGET_URLS[target]}/auth/sso?token=${tokenRow.token}`;

    return new Response(
      JSON.stringify({ success: true, magicLink: magicLinkUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
