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
    const ecosystemApiKey = Deno.env.get("ECOSYSTEM_API_KEY");

    if (!ecosystemApiKey) {
      console.error("ECOSYSTEM_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Ecosystem API key not configured" }), {
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
      .select("name, description, difficulty, game_id, points_reward, skill_tags, games(name), academy_next_step_url, academy_next_step_label")
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
      .select("id, external_attempt_id")
      .eq("user_id", user_id)
      .eq("challenge_id", challenge_id)
      .single();

    // Resolve canonical completion (awarded_points, completed_at) so retries
    // and re-syncs reuse the original event's bytes — never re-stamp with now()
    // or accept caller-supplied awarded_points: 0 as truth. (Academy Flag 1.)
    const { data: latestCompletion } = await adminClient
      .from("challenge_completions")
      .select("awarded_points, completed_at")
      .eq("user_id", user_id)
      .eq("challenge_id", challenge_id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const canonicalAwardedPoints =
      (latestCompletion as any)?.awarded_points ?? awarded_points ?? 0;
    const canonicalCompletedAt =
      (latestCompletion as any)?.completed_at ?? new Date().toISOString();

    // Resolve tenant context (P-3 metadata additions)
    let tenantId: string | null = null;
    let tenantSlug: string | null = null;
    let tenantName: string | null = null;
    const { data: tId } = await adminClient.rpc("get_user_tenant", { _user_id: user_id });
    if (tId) {
      tenantId = tId as string;
      const { data: t } = await adminClient
        .from("tenants")
        .select("slug, name")
        .eq("id", tenantId)
        .single();
      tenantSlug = (t as any)?.slug ?? null;
      tenantName = (t as any)?.name ?? null;
    }

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

    // Calculate score (0–100) using canonical awarded_points
    const maxPoints = (challenge as any)?.points_reward || 0;
    const actualPoints = canonicalAwardedPoints;
    const score = maxPoints > 0 ? Math.round((actualPoints / maxPoints) * 100) : (actualPoints > 0 ? 100 : 0);

    // delivery_id = external_attempt_id (PR P-3). Stable per completion attempt;
    // receiver uses it for idempotency keying so retries collapse to duplicate-200.
    const deliveryId = (enrollment as any)?.external_attempt_id ?? null;

    // Build FLAT payload matching academy's expected contract
    const payload = {
      user_email: userEmail,
      challenge_id: challenge_id,
      score: score,
      completed_at: canonicalCompletedAt,
      task_progress: taskProgress,
      skills_verified: buildSkillsTags(challenge),
      metadata: {
        source: "play.fgn.gg",
        external_user_id: user_id,
        external_attempt_id: deliveryId,
        delivery_id: deliveryId,
        tenant_id: tenantId,
        tenant_slug: tenantSlug,
        tenant_name: tenantName,
        display_name: profile?.display_name || userEmail,
        challenge_name: (challenge as any)?.name || "Unknown Challenge",
        description: (challenge as any)?.description || null,
        difficulty: (challenge as any)?.difficulty || null,
        game_name: (challenge as any)?.games?.name || null,
        awarded_points: actualPoints,
        max_points: maxPoints,
      },
    };

    // Determine academy URL from integration config, fallback to Academy's
    // sync-challenge-completion Edge Function. The legacy default
    // (https://fgn.academy/api/ecosystem/challenge-completed) was a SPA route
    // that silently 200'd index.html — Academy confirmed no handler exists there.
    // (Academy Flag 2a, 2026-05-12.)
    const integration = integrations[0];
    const academyUrl = (integration.additional_config as any)?.api_url
      || "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/sync-challenge-completion";

    // ----- Phase E routing flag (reversible) -----
    // PHASE_E_ROUTING_MODE:
    //   "off"    (default) — direct POST to academy with X-Ecosystem-Key (legacy/Phase D path)
    //   "shadow" — direct POST is authoritative; ALSO fire HMAC-signed webhook dispatch
    //              for parity validation. Webhook failures are logged, never block.
    //   "live"   — HMAC-signed ecosystem-webhook-dispatch is authoritative.
    //              Direct POST is skipped. Flip back to "off"/"shadow" to revert instantly.
    const phaseEMode = (Deno.env.get("PHASE_E_ROUTING_MODE") || "off").toLowerCase();
    const phaseELive = phaseEMode === "live";
    const phaseEShadow = phaseEMode === "shadow";
    console.log(`phase E routing mode: ${phaseEMode}`);

    // Fire-and-forget webhook dispatch helper for shadow/live modes
    const dispatchPhaseE = async (): Promise<{ ok: boolean; status: number; body: string }> => {
      try {
        const dispatchRes = await fetch(`${supabaseUrl}/functions/v1/ecosystem-webhook-dispatch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            event_type: "challenge_completion",
            payload,
          }),
        });
        const txt = await dispatchRes.text();
        console.log(`phase E dispatch -> ${dispatchRes.status}`);
        return { ok: dispatchRes.ok, status: dispatchRes.status, body: txt.substring(0, 200) };
      } catch (e: any) {
        console.error("phase E dispatch error:", e?.message);
        return { ok: false, status: 0, body: e?.message || "dispatch error" };
      }
    };

    // Ecosystem-key auth (legacy X-App-Key retired in P-3).
    const outboundHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Ecosystem-Key": ecosystemApiKey,
      // PR P-3: surface delivery id at header level so receiver can idempotency-key
      // without parsing the body. Receiver accepts X-Delivery-Id / X-Play-Delivery-Id.
      ...(deliveryId ? { "X-Delivery-Id": deliveryId, "X-Play-Delivery-Id": deliveryId } : {}),
      // Path tag for receiver-side log forensics (action prefix already encodes path,
      // but this lets play_sync_attempts.request.headers.x_play_path differentiate cleanly).
      "X-Play-Path": "direct",
    };

    let response: Response;
    if (phaseELive) {
      // Phase E live: webhook dispatch is authoritative. Synthesize a Response so
      // downstream branches (next_step, completion update, logging) keep working.
      const dispatched = await dispatchPhaseE();
      response = new Response(dispatched.body || "{}", {
        status: dispatched.ok ? 200 : (dispatched.status || 502),
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Phase D direct POST (default + shadow modes)
      response = await fetch(academyUrl, {
        method: "POST",
        headers: outboundHeaders,
        body: JSON.stringify(payload),
      });
      // Shadow: fire webhook in parallel for parity validation, do not await result for blocking
      if (phaseEShadow) {
        // intentional: await so logs land in this invocation, but failures don't override `response`
        await dispatchPhaseE();
      }
    }

    const responseText = await response.text();
    const success = response.ok;

    // Parse Academy 404s into specific failure modes so missing work-orders
    // route to ops instead of being mis-surfaced to players as "not registered".
    let academyErrorKind: "user_not_found" | "work_order_missing" | "other_404" | null = null;
    let academyErrorMessage: string | null = null;
    if (!success && response.status === 404) {
      try {
        const parsed = JSON.parse(responseText);
        const errStr = (parsed?.error || "").toString();
        academyErrorMessage = errStr || null;
        if (/user not found/i.test(errStr)) academyErrorKind = "user_not_found";
        else if (/no work order found/i.test(errStr)) academyErrorKind = "work_order_missing";
        else academyErrorKind = "other_404";
      } catch {
        academyErrorKind = "other_404";
      }
    }
    const isUserNotFound = academyErrorKind === "user_not_found";
    const isWorkOrderMissing = academyErrorKind === "work_order_missing";

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
      error_message: success ? null : `HTTP ${response.status}: ${responseText.substring(0, 480)}`,
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

/**
 * Build skill tags forwarded to Academy as `skills_verified`.
 * - If admins curated `challenge.skill_tags`, send those verbatim (primary signal).
 * - Otherwise fall back to the legacy heuristic so untagged challenges keep working.
 * - Difficulty is always appended as a secondary metadata-style tag.
 */
function buildSkillsTags(challenge: any): string[] {
  const tags: string[] = [];
  if (!challenge) return tags;

  const curated: string[] = Array.isArray(challenge.skill_tags) ? challenge.skill_tags : [];
  const cleaned = curated
    .filter((t) => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim().toLowerCase());

  if (cleaned.length > 0) {
    tags.push(...cleaned);
  } else {
    if (challenge.games?.name) tags.push(`game:${challenge.games.name}`);
    tags.push("gaming-proficiency");
  }

  if (challenge.difficulty) tags.push(`difficulty:${challenge.difficulty}`);
  return Array.from(new Set(tags));
}

