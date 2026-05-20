import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const { tournament_id, user_id } = await req.json();
    if (!tournament_id || !user_id) {
      return json({ error: "Missing tournament_id or user_id" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Authorize: caller must be the target user OR a moderator/admin
    if (callerId !== user_id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId);
      const allowed = (roles ?? []).some((r: { role: string }) =>
        ["admin", "moderator"].includes(r.role),
      );
      if (!allowed) return json({ error: "Forbidden" }, 403);
    }

    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .select("discord_role_id")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament?.discord_role_id) {
      return json({ skipped: true, reason: "No discord role configured" });
    }

    const { data: reg } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournament_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (!reg) return json({ error: "User not registered for this tournament" }, 400);

    const { data: profile } = await supabase
      .from("profiles")
      .select("discord_id")
      .eq("user_id", user_id)
      .single();

    if (!profile?.discord_id) {
      return json({ skipped: true, reason: "User has no linked Discord account" });
    }

    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");

    if (!botToken || !guildId) {
      return json({ error: "Discord bot not configured" }, 500);
    }

    const discordRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${profile.discord_id}/roles/${tournament.discord_role_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!discordRes.ok) {
      const body = await discordRes.text();
      console.error("Discord role assignment failed:", discordRes.status, body);
      return json({ error: "Discord API error", status: discordRes.status }, 502);
    }

    return json({ success: true });
  } catch (err) {
    console.error("assign-tournament-role error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
