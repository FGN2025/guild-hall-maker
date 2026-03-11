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
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Parse request body
    const { code, redirect_uri, action } = await req.json();

    // Handle unlink action
    if (action === "unlink") {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({
          discord_id: null,
          discord_username: null,
          discord_avatar: null,
          discord_linked_at: null,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Discord OAuth code exchange
    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DISCORD_CLIENT_ID = Deno.env.get("DISCORD_CLIENT_ID")!;
    const DISCORD_CLIENT_SECRET = Deno.env.get("DISCORD_CLIENT_SECRET")!;
    const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");

    // Exchange code for token
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Discord token exchange failed:", errText);
      return new Response(JSON.stringify({ error: "Discord token exchange failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch Discord user
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch Discord user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discordUser = await userRes.json();
    const discordId = discordUser.id;
    const discordUsername = discordUser.username;
    const discordAvatar = discordUser.avatar;

    // Use service role to update profile (bypasses RLS for unique check)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if this Discord ID is already linked to another account
    const { data: existing } = await serviceClient
      .from("profiles")
      .select("user_id")
      .eq("discord_id", discordId)
      .neq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "This Discord account is already linked to another player." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the user's profile
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({
        discord_id: discordId,
        discord_username: discordUsername,
        discord_avatar: discordAvatar,
        discord_linked_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    // Assign Discord server roles from mappings table (on_link trigger)
    const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
    const DISCORD_VERIFIED_ROLE_ID = Deno.env.get("DISCORD_VERIFIED_ROLE_ID");

    if (DISCORD_BOT_TOKEN && DISCORD_GUILD_ID) {
      try {
        // Fetch all active on_link mappings
        const { data: roleMappings } = await serviceClient
          .from("discord_role_mappings")
          .select("discord_role_id, platform_role")
          .eq("trigger_condition", "on_link")
          .eq("is_active", true);

        // Fetch user's platform roles
        const [userRolesResult, tenantAdminResult] = await Promise.all([
          serviceClient.from("user_roles").select("role").eq("user_id", userId),
          serviceClient.from("tenant_admins").select("id").eq("user_id", userId).limit(1),
        ]);

        const platformRoles: string[] = (userRolesResult.data ?? []).map((r: any) => r.role);
        const isTenantAdmin = (tenantAdminResult.data ?? []).length > 0;
        if (isTenantAdmin) platformRoles.push("tenant_admin");
        // If user has no special roles, they are a regular "user"
        if (platformRoles.length === 0) platformRoles.push("user");

        // Filter mappings: NULL platform_role = all users, otherwise must match
        const roleIds: string[] = (roleMappings ?? [])
          .filter((m: any) => !m.platform_role || platformRoles.includes(m.platform_role))
          .map((m: any) => m.discord_role_id);

        // Fallback to env var if no mappings exist at all
        if ((roleMappings ?? []).length === 0 && DISCORD_VERIFIED_ROLE_ID) {
          roleIds.push(DISCORD_VERIFIED_ROLE_ID);
        }

        // Assign all matched roles
        for (const roleId of roleIds) {
          try {
            await fetch(
              `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`,
              {
                method: "PUT",
                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
              }
            );
          } catch (roleErr) {
            console.error(`Failed to assign Discord role ${roleId}:`, roleErr);
          }
        }
      } catch (roleErr) {
        console.error("Failed to assign Discord roles:", roleErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, discord_username: discordUsername }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Discord callback error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
