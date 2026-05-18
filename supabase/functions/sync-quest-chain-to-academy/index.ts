// Sync a single quest_chain_completions row to FGN Academy via
// ecosystem-webhook-dispatch (HMAC-signed). Idempotent on (user_id, chain_id)
// via stable delivery_id.
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

    const { user_id, chain_id } = await req.json();
    if (!user_id || !chain_id) {
      return json({ error: "user_id and chain_id required" }, 400);
    }

    // Skip if no active academy integration
    const { data: integrations } = await admin
      .from("tenant_integrations")
      .select("id")
      .eq("provider_type", "fgn_academy")
      .eq("is_active", true)
      .limit(1);
    if (!integrations || integrations.length === 0) {
      await mark(admin, user_id, chain_id, true, "no_active_academy_integration");
      return json({ success: true, skipped: "no_active_academy_integration" });
    }

    const { data: completion } = await admin
      .from("quest_chain_completions")
      .select("user_id, chain_id, bonus_points_awarded, completed_at, academy_synced")
      .eq("user_id", user_id)
      .eq("chain_id", chain_id)
      .maybeSingle();

    if (!completion) {
      return json({ success: false, error: "completion_not_found" });
    }
    if (completion.academy_synced === true) {
      return json({ success: true, skipped: "already_synced" });
    }

    const { data: chain } = await admin
      .from("quest_chains")
      .select("id, name, description")
      .eq("id", chain_id)
      .single();
    if (!chain) {
      await mark(admin, user_id, chain_id, false, "chain_not_found");
      return json({ success: false, error: "chain_not_found" });
    }

    const { data: chainQuests } = await admin
      .from("quests")
      .select("id, name, xp_reward, points_reward")
      .eq("chain_id", chain_id);

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(user_id);
    if (userErr || !userData?.user?.email) {
      await mark(admin, user_id, chain_id, false, "user_email_not_found");
      return json({ success: false, error: "user_email_not_found" });
    }
    const userEmail = userData.user.email;

    let tenantId: string | null = null;
    let tenantSlug: string | null = null;
    let tenantName: string | null = null;
    const { data: tId } = await admin.rpc("get_user_tenant", { _user_id: user_id });
    if (tId) {
      tenantId = tId as string;
      const { data: t } = await admin
        .from("tenants").select("slug, name").eq("id", tenantId).single();
      tenantSlug = (t as any)?.slug ?? null;
      tenantName = (t as any)?.name ?? null;
    }

    const { data: profile } = await admin
      .from("profiles").select("display_name").eq("user_id", user_id).single();

    const deliveryId = `quest_chain:${user_id}:${chain_id}`;

    const payload = {
      user_email: userEmail,
      external_user_id: user_id,
      chain: {
        id: chain.id,
        title: (chain as any).name,
        description: (chain as any).description ?? null,
      },
      bonus_points_awarded: (completion as any).bonus_points_awarded ?? 0,
      quests_completed: (chainQuests || []).map((q: any) => ({
        id: q.id,
        name: q.name,
        xp_reward: q.xp_reward ?? 0,
        points_reward: q.points_reward ?? 0,
      })),
      completed_at: (completion as any).completed_at ?? new Date().toISOString(),
      metadata: {
        source: "play.fgn.gg",
        delivery_id: deliveryId,
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
      body: JSON.stringify({ event_type: "quest_chain.completed", payload, tenant_id: tenantId }),
    });

    const dispatchTxt = await dispatchRes.text();
    let dispatched = 0;
    let anyFailure = false;
    try {
      const parsed = JSON.parse(dispatchTxt);
      dispatched = parsed?.dispatched ?? 0;
      anyFailure = Array.isArray(parsed?.results) &&
        parsed.results.some((r: any) => r.status !== "success");
    } catch { /* ignore */ }

    if (dispatchRes.ok && dispatched === 0) {
      await mark(admin, user_id, chain_id, true, "no_active_webhook");
      return json({ success: true, skipped: "no_active_webhook" });
    }

    const success = dispatchRes.ok && !anyFailure;
    const note = success
      ? "synced"
      : `dispatch_failed: HTTP ${dispatchRes.status} ${dispatchTxt.substring(0, 200)}`;
    await mark(admin, user_id, chain_id, success, note);

    return json({ success, dispatched, note });
  } catch (err: any) {
    console.error("sync-quest-chain-to-academy error:", err?.message);
    return json({ error: err?.message || "Internal server error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function mark(
  admin: any,
  user_id: string,
  chain_id: string,
  success: boolean,
  note: string,
) {
  await admin
    .from("quest_chain_completions")
    .update({
      academy_synced: success,
      academy_synced_at: new Date().toISOString(),
      academy_sync_note: note,
    })
    .eq("user_id", user_id)
    .eq("chain_id", chain_id);

  await admin.from("ecosystem_sync_log").insert({
    target_app: "fgn_academy",
    data_type: "quest_chain_completed",
    records_synced: success ? 1 : 0,
    status: success ? "success" : "error",
    error_message: success ? null : note,
  });
}
