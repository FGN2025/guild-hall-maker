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
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { server_id } = await req.json();
    if (!server_id) {
      return new Response(JSON.stringify({ error: "server_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read server config (including panel fields)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: server, error: serverError } = await adminClient
      .from("game_servers")
      .select("panel_type, panel_url, panel_server_id, max_players")
      .eq("id", server_id)
      .single();

    if (serverError || !server) {
      return new Response(JSON.stringify({ error: "Server not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (server.panel_type !== "pterodactyl" || !server.panel_url || !server.panel_server_id) {
      return new Response(
        JSON.stringify({ is_online: null, current_players: null, max_players: server.max_players }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("PTERODACTYL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ is_online: null, current_players: null, max_players: server.max_players, error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const panelUrl = server.panel_url.replace(/\/$/, "");
    const statusRes = await fetch(
      `${panelUrl}/api/client/servers/${server.panel_server_id}/resources`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!statusRes.ok) {
      return new Response(
        JSON.stringify({ is_online: false, current_players: null, max_players: server.max_players, error: `Panel returned ${statusRes.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusData = await statusRes.json();
    const resources = statusData.attributes;
    const isOnline = resources?.current_state === "running";
    // Pterodactyl doesn't always expose player count in resources; 
    // it depends on the egg. We return what we can.
    const currentPlayers = resources?.resources?.players ?? null;

    return new Response(
      JSON.stringify({
        is_online: isOnline,
        current_players: currentPlayers,
        max_players: server.max_players,
        state: resources?.current_state ?? "unknown",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
