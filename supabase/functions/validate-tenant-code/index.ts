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
    const { code, tenant_id, dry_run } = await req.json();

    if (!code || typeof code !== "string" || code.trim().length === 0 || code.trim().length > 50) {
      return new Response(
        JSON.stringify({ valid: false, reason: "Invalid code format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tenant_id && typeof tenant_id !== "string") {
      return new Response(
        JSON.stringify({ valid: false, reason: "Invalid tenant_id." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (dry_run) {
      // Dry run: check validity without incrementing usage
      let query = supabase
        .from("tenant_codes")
        .select("id, code, code_type, tenant_id, campaign_id, description, is_active, expires_at, max_uses, times_used")
        .eq("code", code.trim().toUpperCase())
        .eq("is_active", true);

      if (tenant_id) {
        query = query.eq("tenant_id", tenant_id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Code not found or inactive" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Code has expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (data.max_uses !== null && data.times_used >= data.max_uses) {
        return new Response(
          JSON.stringify({ valid: false, reason: "Code has reached maximum uses" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          valid: true,
          code_id: data.id,
          code_type: data.code_type,
          tenant_id: data.tenant_id,
          campaign_id: data.campaign_id,
          description: data.description,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Full validation with usage increment (atomic via DB function)
    const { data, error } = await supabase.rpc("validate_tenant_code", {
      _code: code.trim(),
      _tenant_id: tenant_id || null,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, reason: err.message || "Validation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
