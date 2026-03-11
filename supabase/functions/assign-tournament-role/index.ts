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
    const { tournament_id, user_id } = await req.json();
    if (!tournament_id || !user_id) {
      return new Response(JSON.stringify({ error: "Missing tournament_id or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tournament's discord_role_id
    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .select("discord_role_id")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament?.discord_role_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "No discord role configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is registered
    const { data: reg } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournament_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (!reg) {
      return new Response(JSON.stringify({ error: "User not registered for this tournament" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's discord_id from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("discord_id")
      .eq("user_id", user_id)
      .single();

    if (!profile?.discord_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "User has no linked Discord account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign Discord role
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");

    if (!botToken || !guildId) {
      return new Response(JSON.stringify({ error: "Discord bot not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discordRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${profile.discord_id}/roles/${tournament.discord_role_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!discordRes.ok) {
      const body = await discordRes.text();
      console.error("Discord role assignment failed:", discordRes.status, body);
      return new Response(JSON.stringify({ error: "Discord API error", status: discordRes.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("assign-tournament-role error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
