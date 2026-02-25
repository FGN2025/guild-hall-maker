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
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // --- Parse body ---
    const { integrationId, dryRun } = await req.json();
    if (!integrationId) {
      return new Response(JSON.stringify({ success: false, error: "integrationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Service-role client for privileged ops ---
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Load integration config ---
    const { data: integration, error: intError } = await serviceClient
      .from("tenant_integrations")
      .select("*")
      .eq("id", integrationId)
      .single();

    if (intError || !integration) {
      return new Response(JSON.stringify({ success: false, error: "Integration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Verify caller is a tenant admin for this tenant ---
    const { data: adminRow } = await serviceClient
      .from("tenant_admins")
      .select("id")
      .eq("tenant_id", integration.tenant_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Check for API key ---
    if (!integration.api_key_encrypted) {
      const msg = "NISC API key not yet configured";
      await serviceClient
        .from("tenant_integrations")
        .update({ last_sync_status: "error", last_sync_message: msg, last_sync_at: new Date().toISOString() })
        .eq("id", integrationId);

      await serviceClient.from("tenant_sync_logs").insert({
        tenant_id: integration.tenant_id,
        integration_id: integrationId,
        provider_type: "nisc",
        status: "error",
        message: msg,
        records_synced: 0,
        dry_run: false,
        triggered_by: userId,
      });

      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!integration.api_url) {
      return new Response(JSON.stringify({ success: false, error: "API URL not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Dry-run: test connectivity ---
    if (dryRun) {
      try {
        const testResp = await fetch(integration.api_url, {
          method: "HEAD",
          headers: { Authorization: `Bearer ${integration.api_key_encrypted}` },
          signal: AbortSignal.timeout(10000),
        });
        const reachable = testResp.ok || testResp.status === 401 || testResp.status === 403;
        const message = reachable
          ? `Endpoint reachable (HTTP ${testResp.status})`
          : `Endpoint returned HTTP ${testResp.status}`;

        return new Response(JSON.stringify({ success: reachable, message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, message: `Cannot reach endpoint: ${e.message}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Full sync ---
    let syncMessage = "";
    let syncStatus = "success";
    let syncedCount = 0;

    try {
      // Placeholder: call NISC API to fetch subscribers
      // Replace this URL path with the actual NISC subscriber endpoint when available
      const niscResp = await fetch(`${integration.api_url}/subscribers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${integration.api_key_encrypted}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!niscResp.ok) {
        throw new Error(`NISC API returned HTTP ${niscResp.status}`);
      }

      const niscData = await niscResp.json();

      // Map NISC response to subscriber rows
      // Adjust field mapping when real NISC API schema is known
      const subscribers = (Array.isArray(niscData) ? niscData : niscData.subscribers || []).map(
        (record: Record<string, unknown>) => ({
          tenant_id: integration.tenant_id,
          external_id: String(record.id || record.account_id || ""),
          account_number: String(record.account_number || record.accountNumber || ""),
          first_name: String(record.first_name || record.firstName || ""),
          last_name: String(record.last_name || record.lastName || ""),
          email: String(record.email || ""),
          phone: String(record.phone || ""),
          address: String(record.address || ""),
          zip_code: String(record.zip_code || record.zipCode || record.zip || ""),
          plan_name: String(record.plan_name || record.planName || record.service_plan || ""),
          service_status: String(record.status || record.service_status || "active"),
          source: "nisc",
          synced_at: new Date().toISOString(),
        })
      );

      // Upsert in batches of 500
      const batchSize = 500;
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        const { error: upsertErr } = await serviceClient
          .from("tenant_subscribers")
          .upsert(batch, { onConflict: "tenant_id,source,external_id" });
        if (upsertErr) throw upsertErr;
        syncedCount += batch.length;
      }

      syncMessage = `Synced ${syncedCount} subscriber(s)`;
    } catch (e) {
      syncStatus = "error";
      syncMessage = e.message || "Sync failed";
    }

    // Update integration status
    await serviceClient
      .from("tenant_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: syncStatus,
        last_sync_message: syncMessage,
      })
      .eq("id", integrationId);

    // Log sync history
    await serviceClient.from("tenant_sync_logs").insert({
      tenant_id: integration.tenant_id,
      integration_id: integrationId,
      provider_type: "nisc",
      status: syncStatus,
      message: syncMessage,
      records_synced: syncedCount,
      dry_run: false,
      triggered_by: userId,
    });

    return new Response(
      JSON.stringify({ success: syncStatus === "success", message: syncMessage, count: syncedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
