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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, ban } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email before deletion (for banning)
    const { data: { user: targetUser }, error: getUserErr } =
      await adminClient.auth.admin.getUserById(user_id);
    console.log("getUserById result:", { targetUser: targetUser?.id, getUserErr: getUserErr?.message });
    if (getUserErr || !targetUser) {
      return new Response(JSON.stringify({ error: "User not found", detail: getUserErr?.message ?? "No user returned for id: " + user_id }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If banning, insert into banned_users first
    if (ban && targetUser.email) {
      await adminClient.from("banned_users").upsert(
        { email: targetUser.email.toLowerCase(), banned_by: caller.id, reason: "Banned by admin" },
        { onConflict: "email" }
      );
    }

    // Cascade delete related data
    const tables = [
      "notifications",
      "notification_preferences",
      "challenge_completions",
      "challenge_enrollments",
      "challenge_evidence",
      "quest_completions",
      "quest_chain_completions",
      "player_quest_xp",
      "player_achievements",
      "tournament_registrations",
      "season_scores",
      "point_adjustments",
      "prize_redemptions",
      "ladder_entries",
      "community_likes",
      "community_posts",
      "coach_messages",
      "coach_conversations",
      "discord_bypass_requests",
      "user_service_interests",
      "tenant_admins",
      "user_roles",
    ];

    for (const table of tables) {
      await adminClient.from(table).delete().eq("user_id", user_id);
    }

    // Nullify match_results references
    await adminClient
      .from("match_results")
      .update({ player1_id: null })
      .eq("player1_id", user_id);
    await adminClient
      .from("match_results")
      .update({ player2_id: null })
      .eq("player2_id", user_id);
    await adminClient
      .from("match_results")
      .update({ winner_id: null })
      .eq("winner_id", user_id);

    // Delete profile
    await adminClient.from("profiles").delete().eq("user_id", user_id);

    // Delete auth user
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user_id);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, banned: !!ban }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
