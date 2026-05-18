// Drains public.passport_refresh_pending: dispatches a debounced
// `passport.refresh_requested` event to Academy per user, at most once per
// 5 minutes per user. Coalesces bursts of achievement/quest/task/chain syncs
// into a single passport recompute call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEBOUNCE_SECONDS = 300; // 5 min
const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Due rows: never sent OR last_sent_at older than debounce AND new request after last send.
    const cutoff = new Date(Date.now() - DEBOUNCE_SECONDS * 1000).toISOString();
    const { data: rows, error } = await admin
      .from("passport_refresh_pending")
      .select("user_id, requested_at, last_sent_at, attempts")
      .or(`last_sent_at.is.null,last_sent_at.lt.${cutoff}`)
      .order("requested_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dispatched = 0;
    let failed = 0;
    for (const row of rows) {
      const userId = (row as any).user_id as string;
      // Skip if a refresh was already sent after the most recent request (race)
      if ((row as any).last_sent_at && (row as any).requested_at <= (row as any).last_sent_at) {
        continue;
      }

      const { data: userRes } = await admin.auth.admin.getUserById(userId);
      const userEmail = userRes?.user?.email;
      if (!userEmail) {
        await admin.from("passport_refresh_pending").update({
          last_sent_at: new Date().toISOString(),
          last_sent_note: "user_email_not_found",
          attempts: ((row as any).attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        failed++;
        continue;
      }

      const { data: tId } = await admin.rpc("get_user_tenant", { _user_id: userId });
      const tenantId = (tId as any) || null;
      const deliveryId = `passport_refresh:${userId}:${Math.floor(Date.now() / (DEBOUNCE_SECONDS * 1000))}`;
      const payload: any = {
        user_id: userId,
        user_email: userEmail,
        external_user_id: userId,
        tenant_id: tenantId,
        requested_at: (row as any).requested_at,
        metadata: { delivery_id: deliveryId, tenant_id: tenantId },
      };

      let success = false;
      let note = "synced";
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/ecosystem-webhook-dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ event_type: "passport.refresh_requested", payload, tenant_id: tenantId }),
        });
        const txt = await res.text();
        let parsed: any = null;
        try { parsed = JSON.parse(txt); } catch { /* ignore */ }
        const dispatchedCount = parsed?.dispatched ?? 0;
        const anyFailure = Array.isArray(parsed?.results) &&
          parsed.results.some((r: any) => r.status !== "success");
        if (res.ok && dispatchedCount === 0) {
          success = true; note = "no_active_webhook";
        } else if (res.ok && !anyFailure) {
          success = true;
        } else {
          note = `dispatch_failed: HTTP ${res.status} ${txt.substring(0, 160)}`;
        }
      } catch (e: any) {
        note = `dispatch_error: ${e?.message || String(e)}`.substring(0, 200);
      }

      await admin.from("passport_refresh_pending").update({
        last_sent_at: new Date().toISOString(),
        last_sent_note: note,
        attempts: ((row as any).attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      await admin.from("ecosystem_sync_log").insert({
        target_app: "fgn_academy",
        data_type: "passport_refresh",
        records_synced: success ? 1 : 0,
        status: success ? "success" : "error",
        error_message: success ? null : note,
        tenant_id: tenantId,
      } as any);

      if (success) dispatched++; else failed++;
    }

    return new Response(JSON.stringify({ processed: rows.length, dispatched, failed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("process-passport-refresh-queue error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
