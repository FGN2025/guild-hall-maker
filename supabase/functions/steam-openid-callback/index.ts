import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const params = url.searchParams;

  // --- Unlink action (POST) ---
  if (req.method === "POST") {
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
    const { data: claimsData, error: claimsErr } =
      await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body = await req.json().catch(() => ({}));
    if (body.action === "unlink") {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient
        .from("profiles")
        .update({ steam_id: null, steam_username: null })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- OpenID callback (GET) ---
  const mode = params.get("openid.mode");
  if (mode !== "id_res") {
    return redirect("/profile?steam=error&reason=invalid_mode");
  }

  // The state param carries the user's JWT so we can identify them
  const state = params.get("state");
  if (!state) {
    return redirect("/profile?steam=error&reason=no_state");
  }

  // Validate the OpenID assertion with Steam
  const verifyParams = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    verifyParams.set(key, value);
  }
  verifyParams.set("openid.mode", "check_authentication");

  const verifyRes = await fetch(
    "https://steamcommunity.com/openid/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString(),
    }
  );
  const verifyText = await verifyRes.text();

  if (!verifyText.includes("is_valid:true")) {
    return redirect("/profile?steam=error&reason=validation_failed");
  }

  // Extract Steam ID from claimed_id
  const claimedId = params.get("openid.claimed_id") ?? "";
  const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
  if (!steamIdMatch) {
    return redirect("/profile?steam=error&reason=no_steam_id");
  }
  const steamId = steamIdMatch[1];

  // Fetch Steam display name
  let steamUsername = steamId;
  const apiKey = Deno.env.get("STEAM_API_KEY");
  if (apiKey) {
    try {
      const summaryRes = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
      );
      const summaryJson = await summaryRes.json();
      const player = summaryJson?.response?.players?.[0];
      if (player?.personaname) {
        steamUsername = player.personaname;
      }
    } catch {
      // Fall back to Steam ID as username
    }
  }

  // Verify JWT from state and update profile
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${state}` } } }
  );

  const { data: claimsData, error: claimsErr } =
    await supabase.auth.getClaims(state);
  if (claimsErr || !claimsData?.claims) {
    return redirect("/profile?steam=error&reason=auth_failed");
  }

  const userId = claimsData.claims.sub;

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await adminClient
    .from("profiles")
    .update({ steam_id: steamId, steam_username: steamUsername })
    .eq("user_id", userId);

  return redirect("/profile?steam=linked");
});

function redirect(path: string): Response {
  const baseUrl = Deno.env.get("SITE_URL") || Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "";
  // Use a relative approach — the edge function returns a redirect to the frontend
  const origin = baseUrl || "https://guild-hall-maker.lovable.app";
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}${path}` },
  });
}
