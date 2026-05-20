import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const { tenant_id } = await req.json();
    if (!tenant_id) return json({ error: "tenant_id is required" }, 400);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const [{ data: roles }, { data: ta }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", callerId),
      supabase.from("tenant_admins").select("id").eq("user_id", callerId).eq("tenant_id", tenant_id).limit(1),
    ]);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    const isTenantAdmin = (ta ?? []).length > 0;
    if (!isAdmin && !isTenantAdmin) return json({ error: "Forbidden" }, 403);

    const authId = Deno.env.get("SMARTY_AUTH_ID");
    const authToken = Deno.env.get("SMARTY_AUTH_TOKEN");
    if (!authId || !authToken) throw new Error("Smarty credentials not configured.");

    let totalUpdated = 0;
    let estimatedCount = 0;

    const { data: rows, error: fetchErr } = await supabase
      .from("tenant_zip_codes")
      .select("id, zip_code")
      .eq("tenant_id", tenant_id)
      .not("zip_code", "eq", "")
      .or("city.is.null,state.is.null")
      .limit(1000);
    if (fetchErr) throw new Error(fetchErr.message);

    if (rows && rows.length > 0) {
      const uniqueZips = [...new Set(rows.map((r: any) => r.zip_code))];
      const zipGeoMap: Record<string, { city: string; state: string }> = {};
      const chunkSize = 100;
      for (let i = 0; i < uniqueZips.length; i += chunkSize) {
        const chunk = uniqueZips.slice(i, i + chunkSize);
        const lookupBody = chunk.map((z: string) => ({ zipcode: z }));
        const smartyRes = await fetch(
          `https://us-zipcode.api.smarty.com/lookup?auth-id=${authId}&auth-token=${authToken}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lookupBody) },
        );
        if (!smartyRes.ok) continue;
        const smartyData = await smartyRes.json();
        for (const result of smartyData) {
          const cityStates = result.city_states;
          if (cityStates && cityStates.length > 0) {
            const inputZip = result.input_index !== undefined ? chunk[result.input_index] : null;
            if (inputZip) zipGeoMap[inputZip] = { city: cityStates[0].city, state: cityStates[0].state_abbreviation };
          }
        }
      }
      for (const row of rows) {
        const geo = zipGeoMap[row.zip_code];
        if (geo) {
          const { error: upErr } = await supabase.from("tenant_zip_codes").update({ city: geo.city, state: geo.state }).eq("id", row.id);
          if (!upErr) totalUpdated++;
        }
      }
    }

    const { data: reverseRows, error: revErr } = await supabase
      .from("tenant_zip_codes")
      .select("id, city, state, zip_code")
      .eq("tenant_id", tenant_id)
      .not("city", "is", null)
      .not("state", "is", null)
      .or("zip_code.is.null,zip_code.eq.")
      .limit(1000);
    if (revErr) throw new Error(revErr.message);

    if (reverseRows && reverseRows.length > 0) {
      const pairMap: Record<string, { city: string; state: string; rowIds: string[] }> = {};
      for (const r of reverseRows) {
        const key = `${(r.city as string).toLowerCase()}|${(r.state as string).toLowerCase()}`;
        if (!pairMap[key]) pairMap[key] = { city: r.city as string, state: r.state as string, rowIds: [] };
        pairMap[key].rowIds.push(r.id);
      }
      for (const pair of Object.values(pairMap)) {
        try {
          const lookupBody = [{ city: pair.city, state: pair.state }];
          const smartyRes = await fetch(
            `https://us-zipcode.api.smarty.com/lookup?auth-id=${authId}&auth-token=${authToken}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lookupBody) },
          );
          if (!smartyRes.ok) continue;
          const smartyData = await smartyRes.json();
          const result = smartyData?.[0];
          const zipcodes = result?.zipcodes;
          if (!zipcodes || zipcodes.length === 0) continue;
          const resolvedZip = zipcodes[0].zipcode;
          const isEstimated = zipcodes.length > 1;
          for (const rowId of pair.rowIds) {
            const { error: upErr } = await supabase
              .from("tenant_zip_codes")
              .update({ zip_code: resolvedZip, zip_estimated: isEstimated })
              .eq("id", rowId);
            if (!upErr) { totalUpdated++; if (isEstimated) estimatedCount++; }
          }
        } catch { /* ignore */ }
      }
    }

    return json({
      updated: totalUpdated, estimated: estimatedCount,
      message: totalUpdated > 0
        ? `Updated ${totalUpdated} ZIP code(s).${estimatedCount > 0 ? ` ${estimatedCount} estimated (multiple ZIPs available).` : ""}`
        : "No ZIP codes need backfilling.",
    });
  } catch (err) {
    return json({ error: (err as Error).message || "Backfill failed." }, 500);
  }
});
