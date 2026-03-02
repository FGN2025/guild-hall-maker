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
    const { tenant_id, first_name, last_name, zip_code, account_number } = await req.json();

    if (!tenant_id || !first_name || !last_name || !zip_code) {
      return new Response(
        JSON.stringify({ valid: false, message: "Missing required fields." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up subscriber locally (case-insensitive name + zip)
    let query = supabase
      .from("tenant_subscribers")
      .select("id")
      .eq("tenant_id", tenant_id)
      .ilike("first_name", first_name.trim())
      .ilike("last_name", last_name.trim())
      .ilike("zip_code", zip_code.trim())
      .limit(1);

    if (account_number) {
      query = query.eq("account_number", account_number.trim());
    }

    const { data: localMatch, error: localErr } = await query;

    if (localErr) {
      console.error("Local lookup error:", localErr);
      return new Response(
        JSON.stringify({ valid: false, message: "Error looking up subscriber records." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (localMatch && localMatch.length > 0) {
      return new Response(
        JSON.stringify({ valid: true, message: "Subscriber verified!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No local match — check if tenant has an active billing integration for real-time lookup
    const { data: integrations } = await supabase
      .from("tenant_integrations")
      .select("provider_type, api_url, api_key_encrypted")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .in("provider_type", ["nisc", "glds"]);

    if (integrations && integrations.length > 0) {
      // For now, we return a message indicating external lookup is not yet wired
      // In production this would call the NISC/GLDS API
      console.log("External integration available but real-time lookup not yet implemented for registration flow.");
    }

    return new Response(
      JSON.stringify({
        valid: false,
        message: "We couldn't find a matching subscriber record. Please check your information and try again.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-subscriber error:", err);
    return new Response(
      JSON.stringify({ valid: false, message: "Internal server error." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
