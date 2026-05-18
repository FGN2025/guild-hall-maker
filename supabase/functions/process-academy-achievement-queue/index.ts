// Drain the academy_achievement_sync queue. Mirrors process-academy-sync-queue:
// reads up to 25, calls sync-achievement-to-academy, deletes on success,
// retries via VT, DLQs after MAX_ATTEMPTS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUEUE = "academy_achievement_sync";
const DLQ = "academy_achievement_sync_dlq";
const BATCH = 25;
const VT_SECONDS = 120;
const MAX_ATTEMPTS = 3;

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

  const { data: msgs, error: readErr } = await admin.rpc("read_email_batch", {
    queue_name: QUEUE,
    batch_size: BATCH,
    vt: VT_SECONDS,
  });

  if (readErr) {
    console.error("read_email_batch failed:", readErr.message);
    return new Response(JSON.stringify({ error: readErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0, succeeded = 0, dlqd = 0, skipped = 0, retried = 0;

  for (const m of (msgs || []) as Array<{ msg_id: number; read_ct: number; message: any }>) {
    processed += 1;
    const payload = m.message || {};
    const { user_id, achievement_id } = payload;

    if (!user_id || !achievement_id) {
      await admin.rpc("move_to_dlq", { source_queue: QUEUE, dlq_name: DLQ, message_id: m.msg_id, payload });
      dlqd += 1;
      continue;
    }

    // Idempotency: skip if already synced
    const { data: existing } = await admin
      .from("player_achievements")
      .select("academy_synced")
      .eq("user_id", user_id)
      .eq("achievement_id", achievement_id)
      .maybeSingle();

    if (existing?.academy_synced === true) {
      await admin.rpc("delete_email", { queue_name: QUEUE, message_id: m.msg_id });
      skipped += 1;
      continue;
    }

    // Bump attempts counter (best-effort)
    await admin
      .from("player_achievements")
      .update({ academy_sync_attempts: m.read_ct })
      .eq("user_id", user_id)
      .eq("achievement_id", achievement_id);

    let success = false;
    try {
      const { data, error } = await admin.functions.invoke("sync-achievement-to-academy", {
        body: { user_id, achievement_id },
      });
      if (error) console.error("sync-achievement-to-academy invoke error:", error.message);
      else success = data?.success === true;
    } catch (e) {
      console.error("sync-achievement-to-academy threw:", (e as Error).message);
    }

    if (success) {
      await admin.rpc("delete_email", { queue_name: QUEUE, message_id: m.msg_id });
      succeeded += 1;
    } else if (m.read_ct >= MAX_ATTEMPTS) {
      await admin.rpc("move_to_dlq", { source_queue: QUEUE, dlq_name: DLQ, message_id: m.msg_id, payload });
      dlqd += 1;
    } else {
      retried += 1;
    }
  }

  const summary = { processed, succeeded, retried, dlqd, skipped };
  console.log("academy_achievement_sync drain:", JSON.stringify(summary));

  if (processed > 0) {
    await admin.from("ecosystem_sync_log").insert({
      data_type: "academy_achievement_sync_worker",
      records_synced: succeeded,
      status: dlqd > 0 ? "error" : "success",
      error_message: dlqd > 0 ? `${dlqd} message(s) moved to DLQ` : null,
    });
  }

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
