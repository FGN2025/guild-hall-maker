import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("No rows provided");
    }

    // Fetch all tenants for provider matching
    const { data: tenants } = await supabase.from("tenants").select("id, name");
    const tenantMap = new Map((tenants || []).map((t: any) => [t.name.toLowerCase(), t.id]));

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const records = batch.map((row: any) => {
        const providerName = row["Provider Name"] || row["provider_name"] || null;
        const address = row["Address"] || row["address"] || null;
        const zipMatch = address ? address.match(/(\d{5})(?:-\d{4})?(?:\s*$|,)/) : null;
        const zipCode = zipMatch ? zipMatch[1] : null;

        let birthday: string | null = null;
        const bdayRaw = row["Birthday"] || row["birthday"] || null;
        if (bdayRaw) {
          try {
            const d = new Date(bdayRaw);
            if (!isNaN(d.getTime())) birthday = d.toISOString().split("T")[0];
          } catch { /* skip */ }
        }

        let legacyCreatedAt: string | null = null;
        const createdRaw = row["Created At"] || row["created_at"] || null;
        if (createdRaw) {
          try {
            const d = new Date(createdRaw);
            if (!isNaN(d.getTime())) legacyCreatedAt = d.toISOString();
          } catch { /* skip */ }
        }

        const tenantId = providerName ? tenantMap.get(providerName.toLowerCase()) || null : null;

        return {
          legacy_username: row["Username"] || row["username"] || "unknown",
          email: row["Email"] || row["email"] || null,
          first_name: row["First Name"] || row["first_name"] || null,
          last_name: row["Last Name"] || row["last_name"] || null,
          address,
          zip_code: zipCode,
          discord_username: row["Discord Username"] || row["discord_username"] || null,
          birthday,
          status: (row["Status"] || row["status"] || "unknown").toLowerCase(),
          profile_completed: (row["Completed Profile"] || row["completed_profile"] || "").toLowerCase() === "yes",
          provider_name: providerName,
          tenant_id: tenantId,
          invite_code: row["Invite Code"] || row["invite_code"] || null,
          legacy_created_at: legacyCreatedAt,
        };
      });

      const { error } = await supabase.from("legacy_users").insert(records);
      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        skipped += records.length;
      } else {
        inserted += records.length;
      }
    }

    return new Response(
      JSON.stringify({ inserted, skipped, errors, total: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
