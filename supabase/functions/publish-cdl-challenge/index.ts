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
    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // RBAC check
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const hasAccess = (roles ?? []).some((r: any) => ["admin", "moderator"].includes(r.role));
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { challenge, tasks, created_by } = body;

    if (!challenge || !tasks || !created_by) {
      return new Response(JSON.stringify({ error: "challenge, tasks, and created_by are required" }), { status: 400, headers: corsHeaders });
    }

    // Admin client with service role key — bypasses RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Insert challenge
    const challengePayload = {
      name: challenge.name,
      description: challenge.description,
      certification_description: challenge.certification_description || null,
      difficulty: challenge.difficulty || "beginner",
      challenge_type: challenge.challenge_type || "monthly",
      points_reward: challenge.points_reward || 10,
      points_first: challenge.points_first || challenge.points_reward || 10,
      points_second: challenge.points_second || Math.max(1, Math.round((challenge.points_reward || 10) * 0.6)),
      points_third: challenge.points_third || Math.max(1, Math.round((challenge.points_reward || 10) * 0.4)),
      points_participation: challenge.points_participation || Math.max(1, Math.round((challenge.points_reward || 10) * 0.2)),
      estimated_minutes: challenge.estimated_minutes || null,
      requires_evidence: challenge.requires_evidence ?? true,
      cdl_domain: challenge.cdl_domain || null,
      cfr_reference: challenge.cfr_reference || null,
      coach_context: challenge.coach_context || null,
      suggested_coach_prompts: challenge.suggested_coach_prompts || null,
      cover_image_prompt: challenge.cover_image_prompt || null,
      game_id: challenge.game_id || null,
      season_id: challenge.season_id || null,
      created_by,
      is_active: false,
      is_featured: false,
    };

    const { data: insertedChallenge, error: challengeErr } = await adminClient
      .from("challenges")
      .insert(challengePayload)
      .select("id, name")
      .single();

    if (challengeErr) {
      console.error("Challenge insert error:", challengeErr);
      return new Response(JSON.stringify({ error: challengeErr.message }), { status: 500, headers: corsHeaders });
    }

    const challengeId = insertedChallenge.id;

    // Insert tasks
    const taskPayloads = (tasks || []).map((t: any, i: number) => ({
      challenge_id: challengeId,
      title: t.title,
      description: t.description || null,
      display_order: t.display_order ?? i + 1,
    }));

    let tasksInserted = 0;
    if (taskPayloads.length > 0) {
      const { error: tasksErr } = await adminClient.from("challenge_tasks").insert(taskPayloads);
      if (tasksErr) {
        console.error("Tasks insert error:", tasksErr);
        // Challenge was inserted, report partial success
        return new Response(
          JSON.stringify({
            challenge_id: challengeId,
            challenge_name: insertedChallenge.name,
            tasks_inserted: 0,
            tasks_error: tasksErr.message,
            status: "partial",
          }),
          { status: 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      tasksInserted = taskPayloads.length;
    }

    return new Response(
      JSON.stringify({
        challenge_id: challengeId,
        challenge_name: insertedChallenge.name,
        tasks_inserted: tasksInserted,
        status: "inserted",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("publish-cdl-challenge error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
