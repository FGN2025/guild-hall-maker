import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMIT = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale, error } = await admin
    .from("challenge_completions")
    .select("user_id, challenge_id, academy_sync_note")
    .or("academy_synced.is.null,academy_synced.eq.false")
    .gte("completed_at", sevenDaysAgo)
    .limit(LIMIT);

  if (error) {
    console.error("backfill query failed:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let enqueued = 0;
  let skipped = 0;
  for (const row of stale || []) {
    // Skip terminal user_not_found rows — Academy will pick them up via late-bind backfill on signup
    if ((row.academy_sync_note || "").startsWith("user_not_found")) {
      skipped += 1;
      continue;
    }
    const { error: enqErr } = await admin.rpc("enqueue_academy_sync", {
      _user_id: row.user_id,
      _challenge_id: row.challenge_id,
    });
    if (!enqErr) enqueued += 1;
  }

  await admin.from("ecosystem_sync_log").insert({
    data_type: "academy_backfill",
    records_synced: enqueued,
    status: "success",
    error_message: skipped > 0 ? `${skipped} terminal rows skipped` : null,
  });

  console.log(`backfill: enqueued=${enqueued} skipped=${skipped}`);
  return new Response(JSON.stringify({ enqueued, skipped, scanned: stale?.length || 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
