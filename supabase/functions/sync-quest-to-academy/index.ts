// Sync a single quest completion to FGN Academy via ecosystem-webhook-dispatch
// (HMAC-signed, X-Play-Signature). Idempotent on (user_id, quest_id):
// updates academy_synced/at/note on the quest_completions row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { user_id, quest_id } = await req.json();
    if (!user_id || !quest_id) {
      return new Response(JSON.stringify({ error: "user_id and quest_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if no active academy integration
    const { data: integrations } = await admin
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

    // Resolve email
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(user_id);
    if (userErr || !userData?.user?.email) {
      await markRow(admin, user_id, quest_id, false, "user_email_not_found");
      return new Response(JSON.stringify({ success: false, error: "user_email_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userEmail = userData.user.email;

    // Quest definition + completion row
    const { data: quest } = await admin
      .from("quests")
      .select("id, name, description, xp_reward, points_reward, chain_id")
      .eq("id", quest_id)
      .single();

    const { data: completion } = await admin
      .from("quest_completions")
      .select("completed_at, awarded_points")
      .eq("user_id", user_id)
      .eq("quest_id", quest_id)
      .single();

    if (!quest || !completion) {
      await markRow(admin, user_id, quest_id, false, "quest_or_completion_missing");
      return new Response(JSON.stringify({ success: false, error: "quest_or_completion_missing" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant context
    let tenantId: string | null = null;
    let tenantSlug: string | null = null;
    let tenantName: string | null = null;
    const { data: tId } = await admin.rpc("get_user_tenant", { _user_id: user_id });
    if (tId) {
      tenantId = tId as string;
      const { data: t } = await admin.from("tenants").select("slug, name").eq("id", tenantId).single();
      tenantSlug = (t as any)?.slug ?? null;
      tenantName = (t as any)?.name ?? null;
    }

    const { data: profile } = await admin
      .from("profiles").select("display_name").eq("user_id", user_id).single();

    const deliveryId = `quest:${user_id}:${quest_id}`;

    const payload = {
      user_email: userEmail,
      external_user_id: user_id,
      quest: {
        id: quest.id,
        name: quest.name,
        description: (quest as any).description,
        xp_reward: (quest as any).xp_reward,
        points_reward: (quest as any).points_reward,
        chain_id: (quest as any).chain_id,
      },
      completed_at: (completion as any).completed_at,
      awarded_points: (completion as any).awarded_points ?? 0,
      metadata: {
        source: "play.fgn.gg",
        delivery_id: deliveryId,
        external_attempt_id: deliveryId,
        tenant_id: tenantId,
        tenant_slug: tenantSlug,
        tenant_name: tenantName,
        display_name: (profile as any)?.display_name || userEmail,
      },
    };

    const dispatchRes = await fetch(`${supabaseUrl}/functions/v1/ecosystem-webhook-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ event_type: "quest.completed", payload, tenant_id: tenantId }),
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
      await markRow(admin, user_id, quest_id, true, "no_active_webhook");
      return new Response(JSON.stringify({ success: true, skipped: "no_active_webhook" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const success = dispatchRes.ok && !anyFailure;
    const note = success
      ? "synced"
      : `dispatch_failed: HTTP ${dispatchRes.status} ${dispatchTxt.substring(0, 200)}`;

    await markRow(admin, user_id, quest_id, success, note);
    if (success) {
      await admin.rpc("enqueue_passport_refresh", { _user_id: user_id });
    }

    return new Response(JSON.stringify({ success, dispatched: dispatchedCount, note }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-quest-to-academy error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function markRow(
  admin: any,
  user_id: string,
  quest_id: string,
  success: boolean,
  note: string,
) {
  await admin
    .from("quest_completions")
    .update({
      academy_synced: success,
      academy_synced_at: new Date().toISOString(),
      academy_sync_note: note,
    })
    .eq("user_id", user_id)
    .eq("quest_id", quest_id);

  await admin.from("ecosystem_sync_log").insert({
    target_app: "fgn_academy",
    data_type: "quest_completed",
    records_synced: success ? 1 : 0,
    status: success ? "success" : "error",
    error_message: success ? null : note,
  });
}
