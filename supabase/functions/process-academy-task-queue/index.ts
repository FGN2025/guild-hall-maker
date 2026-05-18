// Drain the academy_task_sync queue. Mirrors the achievement/quest workers:
// reads up to 25, invokes sync-challenge-task-to-academy, deletes on success,
// retries via VT, DLQs after MAX_ATTEMPTS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUEUE = "academy_task_sync";
const DLQ = "academy_task_sync_dlq";
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
    const { evidence_id } = payload;

    if (!evidence_id) {
      await admin.rpc("move_to_dlq", { source_queue: QUEUE, dlq_name: DLQ, message_id: m.msg_id, payload });
      dlqd += 1;
      continue;
    }

    // Idempotency: skip if already synced
    const { data: existing } = await admin
      .from("challenge_evidence")
      .select("academy_task_synced")
      .eq("id", evidence_id)
      .maybeSingle();

    if (existing?.academy_task_synced === true) {
      await admin.rpc("delete_email", { queue_name: QUEUE, message_id: m.msg_id });
      skipped += 1;
      continue;
    }

    // Bump attempts counter (best-effort)
    await admin
      .from("challenge_evidence")
      .update({ academy_task_sync_attempts: m.read_ct })
      .eq("id", evidence_id);

    let success = false;
    try {
      const { data, error } = await admin.functions.invoke("sync-challenge-task-to-academy", {
        body: { evidence_id },
      });
      if (error) console.error("sync-challenge-task-to-academy invoke error:", error.message);
      else success = data?.success === true;
    } catch (e) {
      console.error("sync-challenge-task-to-academy threw:", (e as Error).message);
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
  console.log("academy_task_sync drain:", JSON.stringify(summary));

  if (processed > 0) {
    await admin.from("ecosystem_sync_log").insert({
      data_type: "academy_task_sync_worker",
      records_synced: succeeded,
      status: dlqd > 0 ? "error" : "success",
      error_message: dlqd > 0 ? `${dlqd} message(s) moved to DLQ` : null,
    });
  }

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
