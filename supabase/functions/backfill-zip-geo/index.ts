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
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find rows missing city or state
    const { data: rows, error: fetchErr } = await supabase
      .from("tenant_zip_codes")
      .select("id, zip_code")
      .eq("tenant_id", tenant_id)
      .or("city.is.null,state.is.null")
      .limit(1000);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0, message: "No ZIP codes need backfilling." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authId = Deno.env.get("SMARTY_AUTH_ID");
    const authToken = Deno.env.get("SMARTY_AUTH_TOKEN");
    if (!authId || !authToken) {
      throw new Error("Smarty credentials not configured.");
    }

    // Deduplicate zip codes for API calls
    const uniqueZips = [...new Set(rows.map((r) => r.zip_code))];
    const zipGeoMap: Record<string, { city: string; state: string }> = {};

    // Batch in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < uniqueZips.length; i += chunkSize) {
      const chunk = uniqueZips.slice(i, i + chunkSize);
      const lookupBody = chunk.map((z) => ({ zipcode: z }));

      const smartyRes = await fetch(
        `https://us-zipcode.api.smarty.com/lookup?auth-id=${authId}&auth-token=${authToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lookupBody),
        }
      );

      if (!smartyRes.ok) {
        console.error(`Smarty batch error: ${smartyRes.status}`);
        continue;
      }

      const smartyData = await smartyRes.json();
      for (const result of smartyData) {
        const zip = result.input_id || chunk[smartyData.indexOf(result)];
        const cityStates = result.city_states;
        if (cityStates && cityStates.length > 0) {
          const inputZip = result.input_index !== undefined ? chunk[result.input_index] : null;
          if (inputZip) {
            zipGeoMap[inputZip] = {
              city: cityStates[0].city,
              state: cityStates[0].state_abbreviation,
            };
          }
        }
      }
    }

    // Update rows
    let updated = 0;
    for (const row of rows) {
      const geo = zipGeoMap[row.zip_code];
      if (geo) {
        const { error: upErr } = await supabase
          .from("tenant_zip_codes")
          .update({ city: geo.city, state: geo.state })
          .eq("id", row.id);
        if (!upErr) updated++;
      }
    }

    return new Response(
      JSON.stringify({ updated, total: rows.length, message: `Updated ${updated} ZIP code(s) with city/state.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Backfill failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
