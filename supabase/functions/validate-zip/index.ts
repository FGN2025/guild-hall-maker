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
    const { zipCode } = await req.json();

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return new Response(
        JSON.stringify({ valid: false, message: "Invalid ZIP code format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authId = Deno.env.get("SMARTY_AUTH_ID");
    const authToken = Deno.env.get("SMARTY_AUTH_TOKEN");

    if (!authId || !authToken) {
      throw new Error("Smarty credentials not configured.");
    }

    // Call Smarty US ZIP Code API
    const smartyUrl = `https://us-zipcode.api.smarty.com/lookup?auth-id=${authId}&auth-token=${authToken}&zipcode=${zipCode}`;
    const smartyRes = await fetch(smartyUrl);

    if (!smartyRes.ok) {
      throw new Error(`Smarty API error: ${smartyRes.status}`);
    }

    const smartyData = await smartyRes.json();

    const result = smartyData?.[0];
    const cityStates = result?.city_states;

    if (!cityStates || cityStates.length === 0) {
      return new Response(
        JSON.stringify({
          valid: false,
          city: null,
          state: null,
          providers: [],
          message: "Invalid ZIP code. Please enter a valid US ZIP code.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const city = cityStates[0].city;
    const state = cityStates[0].state_abbreviation;

    // Lookup providers via Supabase service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: providers, error: provError } = await supabase.rpc(
      "lookup_providers_by_zip",
      { _zip: zipCode }
    );

    if (provError) {
      throw new Error(provError.message);
    }

    // If no providers, fetch the admin-configurable message
    let noProvidersMessage: string | null = null;
    if (!providers || providers.length === 0) {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "no_providers_message")
        .maybeSingle();
      noProvidersMessage = setting?.value || null;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        city,
        state,
        providers: providers || [],
        no_providers_message: noProvidersMessage,
        message:
          providers && providers.length > 0
            ? `Valid ZIP: ${city}, ${state} — ${providers.length} provider(s) found!`
            : `Valid ZIP: ${city}, ${state} — no providers currently serve your area.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: err.message || "Validation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
