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

    // Authorize: admin or tenant admin of this tenant
    const [{ data: roles }, { data: ta }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", callerId),
      supabase.from("tenant_admins").select("id").eq("user_id", callerId).eq("tenant_id", tenant_id).limit(1),
    ]);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    const isTenantAdmin = (ta ?? []).length > 0;
    if (!isAdmin && !isTenantAdmin) return json({ error: "Forbidden" }, 403);

    const { data: rows, error: fetchErr } = await supabase
      .from("legacy_users")
      .select("id, address")
      .eq("tenant_id", tenant_id)
      .is("zip_code", null)
      .not("address", "is", null)
      .limit(1000);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!rows || rows.length === 0) {
      return json({ updated: 0, skipped: 0, message: "No legacy users need ZIP backfill." });
    }

    const zipRegex = /\b(\d{5})\b/;
    const extracted: { id: string; zip: string }[] = [];
    let skipped = 0;
    for (const row of rows) {
      const match = (row.address as string).match(zipRegex);
      if (match) extracted.push({ id: row.id, zip: match[1] });
      else skipped++;
    }
    if (extracted.length === 0) {
      return json({ updated: 0, skipped, message: `No ZIP codes found in ${rows.length} address(es).` });
    }

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
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lookupBody) },
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
            uniqueZips.forEach((z) => validZips.add(z));
          }
        } catch {
          uniqueZips.forEach((z) => validZips.add(z));
        }
      }
    } else {
      extracted.forEach((e) => validZips.add(e.zip));
    }

    let updated = 0;
    for (const entry of extracted) {
      if (!validZips.has(entry.zip)) { skipped++; continue; }
      const { error: upErr } = await supabase.from("legacy_users").update({ zip_code: entry.zip }).eq("id", entry.id);
      if (!upErr) updated++;
    }

    return json({
      updated, skipped,
      message: updated > 0
        ? `Extracted and saved ZIP codes for ${updated} player(s).${skipped > 0 ? ` ${skipped} skipped.` : ""}`
        : "No valid ZIP codes to update.",
    });
  } catch (err) {
    return json({ error: (err as Error).message || "Backfill failed." }, 500);
  }
});
