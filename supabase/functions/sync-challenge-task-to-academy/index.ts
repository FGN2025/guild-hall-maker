// Sync a single approved challenge-task evidence row to FGN Academy via
// ecosystem-webhook-dispatch (HMAC-signed, X-Play-Signature). Idempotent on
// (user_id, challenge_id, task_id) via a stable delivery_id.
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
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { evidence_id } = await req.json();
    if (!evidence_id) {
      return new Response(JSON.stringify({ error: "evidence_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if no active academy integration exists
    const { data: integrations } = await adminClient
      .from("tenant_integrations")
      .select("id")
      .eq("provider_type", "fgn_academy")
      .eq("is_active", true)
      .limit(1);
    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "no_active_academy_integration" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve evidence + enrollment + task
    const { data: evidence } = await adminClient
      .from("challenge_evidence")
      .select("id, enrollment_id, task_id, status, reviewed_at, submitted_at")
      .eq("id", evidence_id)
      .single();

    if (!evidence) {
      return new Response(JSON.stringify({ success: false, error: "evidence_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!evidence.task_id || evidence.status !== "approved") {
      // Trigger should have filtered this, but be defensive — mark and move on.
      await markRow(adminClient, evidence_id, true, "not_approved_task_evidence");
      return new Response(JSON.stringify({ success: true, skipped: "not_approved_task" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: enrollment } = await adminClient
      .from("challenge_enrollments")
      .select("user_id, challenge_id")
      .eq("id", evidence.enrollment_id)
      .single();
    if (!enrollment) {
      await markRow(adminClient, evidence_id, false, "enrollment_not_found");
      return new Response(JSON.stringify({ success: false, error: "enrollment_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = enrollment.user_id as string;
    const challengeId = enrollment.challenge_id as string;
    const taskId = evidence.task_id as string;

    // Resolve user email
    const { data: userData, error: userErr } = await adminClient.auth.admin.getUserById(userId);
    if (userErr || !userData?.user?.email) {
      await markRow(adminClient, evidence_id, false, "user_email_not_found");
      return new Response(JSON.stringify({ success: false, error: "user_email_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userEmail = userData.user.email;

    const { data: challenge } = await adminClient
      .from("challenges")
      .select("id, name")
      .eq("id", challengeId)
      .single();

    const { data: task } = await adminClient
      .from("challenge_tasks")
      .select("id, name, description, verification_type, skill_tags")
      .eq("id", taskId)
      .single();

    if (!challenge || !task) {
      await markRow(adminClient, evidence_id, false, "challenge_or_task_missing");
      return new Response(JSON.stringify({ success: false, error: "challenge_or_task_missing" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve tenant context
    let tenantId: string | null = null;
    let tenantSlug: string | null = null;
    let tenantName: string | null = null;
    const { data: tId } = await adminClient.rpc("get_user_tenant", { _user_id: userId });
    if (tId) {
      tenantId = tId as string;
      const { data: t } = await adminClient
        .from("tenants").select("slug, name").eq("id", tenantId).single();
      tenantSlug = (t as any)?.slug ?? null;
      tenantName = (t as any)?.name ?? null;
    }

    const { data: profile } = await adminClient
      .from("profiles").select("display_name").eq("user_id", userId).single();

    // Stable delivery id per (user, challenge, task) — multiple evidence rows
    // for the same task collapse into one Academy credit.
    const deliveryId = `challenge_task:${userId}:${challengeId}:${taskId}`;
    const verificationType = (task as any).verification_type || "manual";

    const payload = {
      user_email: userEmail,
      external_user_id: userId,
      challenge: {
        id: challenge.id,
        name: (challenge as any).name,
      },
      task: {
        id: task.id,
        name: (task as any).name,
        description: (task as any).description,
        verification_type: verificationType,
        skill_tags: (task as any).skill_tags ?? [],
      },
      completed_at: (evidence as any).reviewed_at ?? (evidence as any).submitted_at ?? new Date().toISOString(),
      evidence_id,
      metadata: {
        source: "play.fgn.gg",
        delivery_id: deliveryId,
        external_attempt_id: evidence_id,
        tenant_id: tenantId,
        tenant_slug: tenantSlug,
        tenant_name: tenantName,
        display_name: (profile as any)?.display_name || userEmail,
        auto_verified: verificationType !== "manual",
      },
    };

    const dispatchRes = await fetch(`${supabaseUrl}/functions/v1/ecosystem-webhook-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ event_type: "challenge.task_completed", payload }),
    });

    const dispatchTxt = await dispatchRes.text();
    let dispatchedCount = 0;
    let anyFailure = false;
    try {
      const parsed = JSON.parse(dispatchTxt);
      dispatchedCount = parsed?.dispatched ?? 0;
      anyFailure = Array.isArray(parsed?.results) &&
        parsed.results.some((r: any) => r.status !== "success");
    } catch { /* ignore */ }

    if (dispatchRes.ok && dispatchedCount === 0) {
      await markRow(adminClient, evidence_id, true, "no_active_webhook");
      return new Response(JSON.stringify({ success: true, skipped: "no_active_webhook" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const success = dispatchRes.ok && !anyFailure;
    const note = success
      ? "synced"
      : `dispatch_failed: HTTP ${dispatchRes.status} ${dispatchTxt.substring(0, 200)}`;

    await markRow(adminClient, evidence_id, success, note);

    return new Response(JSON.stringify({ success, dispatched: dispatchedCount, note }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-challenge-task-to-academy error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function markRow(
  admin: any,
  evidence_id: string,
  success: boolean,
  note: string,
) {
  await admin
    .from("challenge_evidence")
    .update({
      academy_task_synced: success,
      academy_task_synced_at: new Date().toISOString(),
      academy_task_sync_note: note,
    })
    .eq("id", evidence_id);

  await admin.from("ecosystem_sync_log").insert({
    target_app: "fgn_academy",
    data_type: "challenge_task_completed",
    records_synced: success ? 1 : 0,
    status: success ? "success" : "error",
    error_message: success ? null : note,
  });
}
