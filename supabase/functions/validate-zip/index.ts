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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let city: string | null = null;
    let state: string | null = null;
    let locationKnown = false;

    // 1) PRIMARY: customer-uploaded tenant ZIPs (also yields providers + city/state)
    const { data: providers, error: provError } = await supabase.rpc(
      "lookup_providers_by_zip",
      { _zip: zipCode }
    );
    if (provError) throw new Error(provError.message);

    if (providers && providers.length > 0) {
      const withGeo = providers.find((p: any) => p.city && p.state) ?? providers[0];
      city = withGeo?.city ?? null;
      state = withGeo?.state ?? null;
      locationKnown = !!(city && state);
    }

    // 2) FALLBACK: national ZIP table (free, local) for city/state when no tenant match
    if (!locationKnown) {
      const { data: nat } = await supabase
        .from("national_zip_codes")
        .select("city, state")
        .eq("zip_code", zipCode)
        .maybeSingle();
      if (nat?.city && nat?.state) {
        city = nat.city;
        state = nat.state;
        locationKnown = true;
      }
    }

    // 3) LAST RESORT: Smarty (only when we have no local data at all)
    if (!locationKnown) {
      const authId = Deno.env.get("SMARTY_AUTH_ID");
      const authToken = Deno.env.get("SMARTY_AUTH_TOKEN");
      if (authId && authToken) {
        try {
          const smartyUrl = `https://us-zipcode.api.smarty.com/lookup?auth-id=${authId}&auth-token=${authToken}&zipcode=${zipCode}`;
          const smartyRes = await fetch(smartyUrl);
          if (smartyRes.ok) {
            const smartyData = await smartyRes.json();
            const cityStates = smartyData?.[0]?.city_states;
            if (cityStates && cityStates.length > 0) {
              city = cityStates[0].city;
              state = cityStates[0].state_abbreviation;
              locationKnown = true;
            }
          }
        } catch (_e) {
          // swallow — we'll just return without city/state
        }
      }
    }

    // Strip city/state from the providers payload (keep public shape stable)
    const providersOut = (providers || []).map((p: any) => ({
      tenant_id: p.tenant_id,
      tenant_name: p.tenant_name,
      tenant_slug: p.tenant_slug,
      logo_url: p.logo_url,
    }));

    let noProvidersMessage: string | null = null;
    if (providersOut.length === 0) {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "no_providers_message")
        .maybeSingle();
      noProvidersMessage = (setting?.value as string) || null;
    }

    const locationLabel = locationKnown && city && state ? `${city}, ${state}` : `ZIP ${zipCode}`;

    return new Response(
      JSON.stringify({
        valid: true,
        city,
        state,
        smarty_ok: locationKnown,
        providers: providersOut,
        no_providers_message: noProvidersMessage,
        message:
          providersOut.length > 0
            ? `${locationLabel} — ${providersOut.length} provider(s) found!`
            : `${locationLabel} — no providers currently serve your area.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: (err as Error).message || "Validation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
