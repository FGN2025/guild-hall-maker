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
      return new Response(JSON.stringify({ success: true, message: "No active academy integration, skipped" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get challenge details (including academy next step fallback fields)
    const { data: challenge } = await adminClient
      .from("challenges")
      .select("name, description, difficulty, game_id, points_reward, games(name), academy_next_step_url, academy_next_step_label")
      .eq("id", challenge_id)
      .single();

    // Get player display name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", user_id)
      .single();

    // Get challenge tasks and their completion status for this user
    const { data: tasks } = await adminClient
      .from("challenge_tasks")
      .select("id, title, display_order")
      .eq("challenge_id", challenge_id)
      .order("display_order", { ascending: true });

    // Get evidence for task-level completion status
    const { data: enrollment } = await adminClient
      .from("challenge_enrollments")
      .select("id")
      .eq("user_id", user_id)
      .eq("challenge_id", challenge_id)
      .single();

    let taskEvidence: any[] = [];
    if (enrollment) {
      const { data: evidence } = await adminClient
        .from("challenge_evidence")
        .select("task_id, status, submitted_at")
        .eq("enrollment_id", enrollment.id);
      taskEvidence = evidence || [];
    }

    // Build task_progress array
    const taskProgress = (tasks || []).map((task: any) => {
      const ev = taskEvidence.find((e: any) => e.task_id === task.id);
      const isCompleted = ev?.status === "approved";
      return {
        task_id: task.id,
        title: task.title,
        completed: isCompleted,
        status: isCompleted ? "completed" : "pending",
        completed_at: isCompleted ? ev?.submitted_at : null,
      };
    });

    // Calculate score (0–100)
    const maxPoints = (challenge as any)?.points_reward || 0;
    const actualPoints = awarded_points || 0;
    const score = maxPoints > 0 ? Math.round((actualPoints / maxPoints) * 100) : (actualPoints > 0 ? 100 : 0);

    // Build FLAT payload matching academy's expected contract
    const payload = {
      user_email: userEmail,
      challenge_id: challenge_id,
      score: score,
      completed_at: new Date().toISOString(),
      task_progress: taskProgress,
      skills_verified: buildSkillsTags(challenge),
      metadata: {
        source: "play.fgn.gg",
        external_user_id: user_id,
        display_name: profile?.display_name || userEmail,
        challenge_name: (challenge as any)?.name || "Unknown Challenge",
        description: (challenge as any)?.description || null,
        difficulty: (challenge as any)?.difficulty || null,
        game_name: (challenge as any)?.games?.name || null,
        awarded_points: actualPoints,
        max_points: maxPoints,
      },
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
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const success = response.ok;
    const isUserNotFound = !success && response.status === 404;

    // Parse academy response for next_step
    let academyNextStep: any = null;
    if (success) {
      try {
        const responseJson = JSON.parse(responseText);
        if (responseJson.next_step && responseJson.next_step.url) {
          academyNextStep = responseJson.next_step;
        }
      } catch { /* response is not JSON or has no next_step */ }
    }

    // Fall back to challenge-level configured next step
    if (!academyNextStep && (challenge as any)?.academy_next_step_url) {
      academyNextStep = {
        title: (challenge as any).academy_next_step_label || "Continue on FGN Academy",
        url: (challenge as any).academy_next_step_url,
        description: "Further skills development is available on FGN Academy.",
      };
    }

    // Build sync note
    const syncNote = success
      ? "Synced successfully"
      : isUserNotFound
        ? "user_not_found"
        : `HTTP ${response.status}: ${responseText.substring(0, 200)}`;

    // Update the completion record
    await adminClient
      .from("challenge_completions")
      .update({
        academy_synced: success,
        academy_synced_at: new Date().toISOString(),
        academy_sync_note: syncNote,
        ...(academyNextStep ? { academy_next_step: academyNextStep } : {}),
      } as any)
      .eq("user_id", user_id)
      .eq("challenge_id", challenge_id)
      .order("completed_at", { ascending: false })
      .limit(1);

    // Send in-app notification for academy next step
    if (academyNextStep) {
      const nextStepTitle = academyNextStep.title || "Skills Development";
      await adminClient.from("notifications").insert({
        user_id,
        type: "info",
        title: "Continue Your Skills Journey",
        message: `📚 "${nextStepTitle}" is available on FGN Academy — continue developing your skills!`,
        link: academyNextStep.url,
      });
    }

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
      user_not_found: isUserNotFound,
      academy_next_step: academyNextStep,
      message: success ? "Synced to academy" : isUserNotFound ? "User not registered on FGN Academy" : `Academy returned ${response.status}`,
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

/** Build free-form skill tags from challenge properties */
function buildSkillsTags(challenge: any): string[] {
  const tags: string[] = [];
  if (!challenge) return tags;
  if (challenge.difficulty) tags.push(`difficulty:${challenge.difficulty}`);
  if (challenge.games?.name) tags.push(`game:${challenge.games.name}`);
  tags.push("gaming-proficiency");
  return tags;
}
