import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const STEAM_API_BASE = "https://api.steampowered.com";
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const steamApiKey = Deno.env.get("STEAM_API_KEY")!;

    // Validate user
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

    // Admin client for upserts
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user's steam_id
    const { data: profile } = await adminClient
      .from("profiles")
      .select("steam_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.steam_id) {
      return new Response(
        JSON.stringify({ error: "No Steam account linked. Please link your Steam account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    const { data: lastSync } = await adminClient
      .from("steam_player_achievements")
      .select("synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSync?.synced_at) {
      const elapsed = Date.now() - new Date(lastSync.synced_at).getTime();
      if (elapsed < COOLDOWN_MS) {
        const waitSecs = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return new Response(
          JSON.stringify({ error: `Please wait ${waitSecs}s before syncing again.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get all games with steam_app_id
    const { data: games } = await adminClient
      .from("games")
      .select("steam_app_id, name")
      .not("steam_app_id", "is", null);

    if (!games?.length) {
      return new Response(
        JSON.stringify({ synced: 0, games_checked: 0, private_games: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSynced = 0;
    const privateGames: string[] = [];
    const now = new Date().toISOString();

    for (const game of games) {
      try {
        const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v0001?appid=${game.steam_app_id}&key=${steamApiKey}&steamid=${profile.steam_id}&format=json`;
        const res = await fetch(url);
        const json = await res.json();

        if (!json.playerstats?.success || !json.playerstats?.achievements) {
          privateGames.push(game.name ?? game.steam_app_id!);
          continue;
        }

        const rows = json.playerstats.achievements.map((a: any) => ({
          user_id: userId,
          steam_app_id: game.steam_app_id!,
          achievement_api_name: a.apiname,
          achieved: a.achieved === 1,
          unlock_time: a.unlocktime > 0 ? new Date(a.unlocktime * 1000).toISOString() : null,
          synced_at: now,
        }));

        if (rows.length > 0) {
          const { error: upsertError } = await adminClient
            .from("steam_player_achievements")
            .upsert(rows, { onConflict: "user_id,steam_app_id,achievement_api_name" });

          if (!upsertError) {
            totalSynced += rows.length;
          }
        }
      } catch {
        privateGames.push(game.name ?? game.steam_app_id!);
      }
    }

    return new Response(
      JSON.stringify({
        synced: totalSynced,
        games_checked: games.length,
        private_games: privateGames,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
