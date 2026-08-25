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
    // DISABLED: the NISC subscriber endpoint and response schema below were a
    // best-guess placeholder that was never validated against the real NISC
    // API. Rather than silently "succeeding" with unverified field mapping,
    // full sync fails closed until the real integration is implemented.
    // The dry-run connectivity check above remains available.
    let syncMessage = "NISC integration is not configured: the subscriber API mapping has not been validated against the real NISC API. Full sync is disabled until the integration is implemented.";
    let syncStatus = "error";
    let syncedCount = 0;

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
