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

    // Fetch legacy users with address but no zip_code
    const { data: rows, error: fetchErr } = await supabase
      .from("legacy_users")
      .select("id, address")
      .eq("tenant_id", tenant_id)
      .is("zip_code", null)
      .not("address", "is", null)
      .limit(1000);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0, skipped: 0, message: "No legacy users need ZIP backfill." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract 5-digit ZIPs from address via regex
    const zipRegex = /\b(\d{5})\b/;
    const extracted: { id: string; zip: string }[] = [];
    let skipped = 0;

    for (const row of rows) {
      const match = (row.address as string).match(zipRegex);
      if (match) {
        extracted.push({ id: row.id, zip: match[1] });
      } else {
        skipped++;
      }
    }

    if (extracted.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0, skipped, message: `No ZIP codes found in ${rows.length} address(es).` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate extracted ZIPs via Smarty API (batch)
    const authId = Deno.env.get("SMARTY_AUTH_ID");
    const authToken = Deno.env.get("SMARTY_AUTH_TOKEN");

    const validZips = new Set<string>();

    if (authId && authToken) {
      const uniqueZips = [...new Set(extracted.map((e) => e.zip))];
      const chunkSize = 100;

      for (let i = 0; i < uniqueZips.length; i += chunkSize) {
        const chunk = uniqueZips.slice(i, i + chunkSize);
        const lookupBody = chunk.map((z) => ({ zipcode: z }));

        try {
          const smartyRes = await fetch(
            `https://us-zipcode.api.smarty.com/lookup?auth-id=${authId}&auth-token=${authToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lookupBody),
            }
          );

          if (smartyRes.ok) {
            const smartyData = await smartyRes.json();
            for (const result of smartyData) {
              if (result.city_states && result.city_states.length > 0) {
                const inputZip = result.input_index !== undefined ? chunk[result.input_index] : null;
                if (inputZip) validZips.add(inputZip);
              }
            }
          } else {
            console.error(`Smarty batch error: ${smartyRes.status}`);
            // Fall back to trusting regex if Smarty fails
            uniqueZips.forEach((z) => validZips.add(z));
          }
        } catch (e) {
          console.error("Smarty request failed:", e);
          uniqueZips.forEach((z) => validZips.add(z));
        }
      }
    } else {
      // No Smarty credentials — trust regex results
      extracted.forEach((e) => validZips.add(e.zip));
    }

    // Update legacy_users with validated ZIPs
    let updated = 0;
    for (const entry of extracted) {
      if (!validZips.has(entry.zip)) {
        skipped++;
        continue;
      }
      const { error: upErr } = await supabase
        .from("legacy_users")
        .update({ zip_code: entry.zip })
        .eq("id", entry.id);
      if (!upErr) updated++;
    }

    return new Response(
      JSON.stringify({
        updated,
        skipped,
        message: updated > 0
          ? `Extracted and saved ZIP codes for ${updated} player(s).${skipped > 0 ? ` ${skipped} skipped.` : ""}`
          : "No valid ZIP codes to update.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Backfill failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
