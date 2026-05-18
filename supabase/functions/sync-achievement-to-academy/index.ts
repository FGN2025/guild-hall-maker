// Sync a single player achievement to FGN Academy via the ecosystem-webhook-dispatch
// (HMAC-signed, X-Play-Signature). Idempotent on (user_id, achievement_id):
// updates academy_synced/at/note/attempts on the player_achievements row.
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

    const { user_id, achievement_id } = await req.json();
    if (!user_id || !achievement_id) {
      return new Response(JSON.stringify({ error: "user_id and achievement_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if no active academy integration exists (parity with sync-to-academy)
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

    // Resolve user email
    const { data: userData, error: userErr } = await adminClient.auth.admin.getUserById(user_id);
    if (userErr || !userData?.user?.email) {
      await markRow(adminClient, user_id, achievement_id, false, "user_email_not_found");
      return new Response(JSON.stringify({ success: false, error: "user_email_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userEmail = userData.user.email;

    // Resolve achievement definition + earned row
    const { data: def } = await adminClient
      .from("achievement_definitions")
      .select("id, name, description, tier, category, icon")
      .eq("id", achievement_id)
      .single();

    const { data: earned } = await adminClient
      .from("player_achievements")
      .select("awarded_at, progress, notes")
      .eq("user_id", user_id)
      .eq("achievement_id", achievement_id)
      .single();

    if (!def || !earned) {
      await markRow(adminClient, user_id, achievement_id, false, "achievement_or_award_missing");
      return new Response(JSON.stringify({ success: false, error: "achievement_or_award_missing" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve tenant context
    let tenantId: string | null = null;
    let tenantSlug: string | null = null;
    let tenantName: string | null = null;
    const { data: tId } = await adminClient.rpc("get_user_tenant", { _user_id: user_id });
    if (tId) {
      tenantId = tId as string;
      const { data: t } = await adminClient
        .from("tenants").select("slug, name").eq("id", tenantId).single();
      tenantSlug = (t as any)?.slug ?? null;
      tenantName = (t as any)?.name ?? null;
    }

    const { data: profile } = await adminClient
      .from("profiles").select("display_name").eq("user_id", user_id).single();

    // Stable delivery id per (user, achievement) — receiver uses for idempotency
    const deliveryId = `ach:${user_id}:${achievement_id}`;

    const payload = {
      user_email: userEmail,
      external_user_id: user_id,
      achievement: {
        id: def.id,
        name: def.name,
        description: def.description,
        tier: def.tier,
        category: def.category,
        icon: def.icon,
      },
      earned_at: (earned as any).awarded_at,
      metadata: {
        source: "play.fgn.gg",
        delivery_id: deliveryId,
        external_attempt_id: deliveryId,
        tenant_id: tenantId,
        tenant_slug: tenantSlug,
        tenant_name: tenantName,
        display_name: (profile as any)?.display_name || userEmail,
        progress: (earned as any).progress ?? null,
        notes: (earned as any).notes ?? null,
      },
    };

    // Dispatch via HMAC-signed ecosystem webhook (matches Phase E contract)
    const dispatchRes = await fetch(`${supabaseUrl}/functions/v1/ecosystem-webhook-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ event_type: "achievement.earned", payload, tenant_id: tenantId }),
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

    // If no active webhook target was configured for achievement.earned, treat as
    // soft-skip success so we don't retry forever. (Same shape as sync-to-academy
    // "no active integration" branch.)
    if (dispatchRes.ok && dispatchedCount === 0) {
      await markRow(adminClient, user_id, achievement_id, true, "no_active_webhook");
      return new Response(JSON.stringify({ success: true, skipped: "no_active_webhook" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const success = dispatchRes.ok && !anyFailure;
    const note = success
      ? "synced"
      : `dispatch_failed: HTTP ${dispatchRes.status} ${dispatchTxt.substring(0, 200)}`;

    await markRow(adminClient, user_id, achievement_id, success, note);
    if (success) {
      await adminClient.rpc("enqueue_passport_refresh", { _user_id: user_id });
    }

    return new Response(JSON.stringify({ success, dispatched: dispatchedCount, note }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-achievement-to-academy error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function markRow(
  admin: any,
  user_id: string,
  achievement_id: string,
  success: boolean,
  note: string,
) {
  await admin
    .from("player_achievements")
    .update({
      academy_synced: success,
      academy_synced_at: new Date().toISOString(),
      academy_sync_note: note,
    })
    .eq("user_id", user_id)
    .eq("achievement_id", achievement_id);

  await admin.from("ecosystem_sync_log").insert({
    target_app: "fgn_academy",
    data_type: "achievement_earned",
    records_synced: success ? 1 : 0,
    status: success ? "success" : "error",
    error_message: success ? null : note,
  });
}
