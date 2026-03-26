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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const academyApiKey = Deno.env.get("FGN_ACADEMY_API_KEY");

    if (!academyApiKey) {
      console.error("FGN_ACADEMY_API_KEY secret is not configured");
      return new Response(JSON.stringify({ error: "Academy API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { user_id, challenge_id, awarded_points } = body;

    if (!user_id || !challenge_id) {
      return new Response(JSON.stringify({ error: "user_id and challenge_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user email
    const { data: userData, error: userErr } = await adminClient.auth.admin.getUserById(user_id);
    if (userErr || !userData?.user?.email) {
      console.error("Could not resolve user email:", userErr?.message);
      return new Response(JSON.stringify({ error: "Could not resolve user email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userEmail = userData.user.email;

    // Check if any tenant has an active fgn_academy integration
    const { data: integrations } = await adminClient
      .from("tenant_integrations")
      .select("id, tenant_id, additional_config")
      .eq("provider_type", "fgn_academy")
      .eq("is_active", true);

    if (!integrations || integrations.length === 0) {
      // No active academy integration — skip silently
      return new Response(JSON.stringify({ success: true, message: "No active academy integration, skipped" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get challenge details
    const { data: challenge } = await adminClient
      .from("challenges")
      .select("name, description, difficulty, game_id, games(name)")
      .eq("id", challenge_id)
      .single();

    // Get player display name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", user_id)
      .single();

    // Build the payload for the academy
    const payload = {
      source: "play.fgn.gg",
      event_type: "challenge_completed",
      player: {
        email: userEmail,
        display_name: profile?.display_name || userEmail,
        external_id: user_id,
      },
      challenge: {
        id: challenge_id,
        name: (challenge as any)?.name || "Unknown Challenge",
        description: (challenge as any)?.description || null,
        difficulty: (challenge as any)?.difficulty || null,
        game_name: (challenge as any)?.games?.name || null,
      },
      awarded_points: awarded_points || 0,
      completed_at: new Date().toISOString(),
    };

    // Determine academy URL from integration config, fallback to default
    const integration = integrations[0];
    const academyUrl = (integration.additional_config as any)?.api_url
      || "https://fgn.academy/api/ecosystem/challenge-completed";

    // POST to the academy
    const response = await fetch(academyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Key": academyApiKey,
        "X-Source-App": "play.fgn.gg",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const success = response.ok;

    // Update the completion record
    await adminClient
      .from("challenge_completions")
      .update({
        academy_synced: success,
        academy_synced_at: new Date().toISOString(),
      } as any)
      .eq("user_id", user_id)
      .eq("challenge_id", challenge_id)
      .order("completed_at", { ascending: false })
      .limit(1);

    // Log to ecosystem_sync_log
    await adminClient.from("ecosystem_sync_log").insert({
      target_app: "fgn_academy",
      data_type: "challenge_completion",
      records_synced: success ? 1 : 0,
      status: success ? "success" : "error",
      error_message: success ? null : `HTTP ${response.status}: ${responseText.substring(0, 500)}`,
    });

    return new Response(JSON.stringify({
      success,
      message: success ? "Synced to academy" : `Academy returned ${response.status}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-to-academy error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
