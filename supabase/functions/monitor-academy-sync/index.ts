import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FAILURE_THRESHOLD = 5;

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

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Count academy sync failures in the last 24 hours
    const { data: failures, error: queryErr } = await adminClient
      .from("ecosystem_sync_log")
      .select("id", { count: "exact" })
      .eq("target_app", "fgn_academy")
      .eq("status", "error")
      .gte("created_at", twentyFourHoursAgo);

    if (queryErr) {
      console.error("Failed to query sync log:", queryErr.message);
      return new Response(JSON.stringify({ error: queryErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const failureCount = failures?.length ?? 0;

    if (failureCount < FAILURE_THRESHOLD) {
      return new Response(JSON.stringify({
        status: "ok",
        failures_24h: failureCount,
        threshold: FAILURE_THRESHOLD,
        message: "Below threshold, no alert sent",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we already alerted recently (within the last 6 hours) to avoid spam
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: recentAlerts } = await adminClient
      .from("notifications")
      .select("id")
      .eq("type", "warning")
      .eq("title", "Academy Sync Failures Detected")
      .gte("created_at", sixHoursAgo)
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      return new Response(JSON.stringify({
        status: "suppressed",
        failures_24h: failureCount,
        message: "Alert already sent within the last 6 hours",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recent error messages for context
    const { data: recentErrors } = await adminClient
      .from("ecosystem_sync_log")
      .select("error_message, created_at")
      .eq("target_app", "fgn_academy")
      .eq("status", "error")
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(3);

    const errorSummary = (recentErrors || [])
      .map((e: any) => (e.error_message || "Unknown error").substring(0, 80))
      .join("; ");

    // Get all admin user IDs
    const { data: adminRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminIds = (adminRoles || []).map((r: any) => r.user_id);

    if (adminIds.length === 0) {
      console.warn("No admin users found to notify");
      return new Response(JSON.stringify({
        status: "no_admins",
        failures_24h: failureCount,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert notifications for all admins
    const notifications = adminIds.map((uid: string) => ({
      user_id: uid,
      type: "warning",
      title: "Academy Sync Failures Detected",
      message: `${failureCount} academy sync failures in the last 24 hours (threshold: ${FAILURE_THRESHOLD}). Recent errors: ${errorSummary || "check ecosystem sync log"}`,
      link: "/admin/ecosystem",
    }));

    const { error: insertErr } = await adminClient
      .from("notifications")
      .insert(notifications);

    if (insertErr) {
      console.error("Failed to insert alert notifications:", insertErr.message);
    }

    // Also send email alerts to admins
    for (const uid of adminIds) {
      const { data: userData } = await adminClient.auth.admin.getUserById(uid);
      const email = userData?.user?.email;
      if (email) {
        const shouldEmail = await adminClient
          .rpc("should_notify", { _user_id: uid, _type: "system_alert", _channel: "email" });

        if (shouldEmail.data !== false) {
          await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              type: "system_alert",
              target_email: email,
              record: {
                title: "Academy Sync Failures Detected",
                message: `${failureCount} academy sync failures detected in the last 24 hours. Most recent errors: ${errorSummary}`,
              },
            }),
          });
        }
      }
    }

    return new Response(JSON.stringify({
      status: "alerted",
      failures_24h: failureCount,
      admins_notified: adminIds.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("monitor-academy-sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
