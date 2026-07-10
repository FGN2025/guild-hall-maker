// Retries Discord role assignments that were flagged retry_pending.
// Invoked by pg_cron every minute with a shared-secret header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-secret",
};

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

function backoffSeconds(attempt: number): number {
  // 30s, 60s, 120s, 240s, 480s (cap 30min)
  return Math.min(30 * Math.pow(2, attempt - 1), 30 * 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("DISCORD_ROLE_RETRY_SECRET");
  const provided = req.headers.get("x-retry-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
  const guildId = Deno.env.get("DISCORD_GUILD_ID");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!botToken || !guildId) {
    return new Response(JSON.stringify({ ok: false, error: "bot_not_configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: rows, error } = await admin
    .from("discord_role_action_log")
    .select("id, discord_id, role_id, attempt")
    .eq("status", "retry_pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const row of rows ?? []) {
    const r = row as { id: string; discord_id: string | null; role_id: string | null; attempt: number };
    if (!r.discord_id || !r.role_id) {
      await admin.from("discord_role_action_log").update({
        status: "failed",
        error_message: "missing discord_id or role_id",
      }).eq("id", r.id);
      results.push({ id: r.id, outcome: "invalid" });
      continue;
    }

    let discordStatus = 0;
    let bodyText = "";
    let retryAfter: number | null = null;

    try {
      const resp = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${r.discord_id}/roles/${r.role_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      discordStatus = resp.status;
      bodyText = (await resp.text().catch(() => "")).slice(0, 500);
      const ra = resp.headers.get("Retry-After");
      retryAfter = ra ? parseInt(ra, 10) || null : null;
    } catch (e) {
      bodyText = (e as Error).message.slice(0, 500);
    }

    const nextAttempt = r.attempt + 1;

    if (discordStatus >= 200 && discordStatus < 300) {
      await admin.from("discord_role_action_log").update({
        status: "success",
        http_status: discordStatus,
        error_message: null,
        attempt: nextAttempt,
        next_retry_at: null,
      }).eq("id", r.id);
      results.push({ id: r.id, outcome: "success" });
      continue;
    }

    const retryable = discordStatus === 429 || (discordStatus >= 500 && discordStatus < 600) || discordStatus === 0;
    if (retryable && nextAttempt <= MAX_ATTEMPTS) {
      const delay = retryAfter ?? backoffSeconds(nextAttempt);
      await admin.from("discord_role_action_log").update({
        status: "retry_pending",
        http_status: discordStatus || null,
        error_message: bodyText,
        attempt: nextAttempt,
        next_retry_at: new Date(Date.now() + delay * 1000).toISOString(),
      }).eq("id", r.id);
      results.push({ id: r.id, outcome: "retry_scheduled", in_seconds: delay });
    } else {
      await admin.from("discord_role_action_log").update({
        status: "failed",
        http_status: discordStatus || null,
        error_message: bodyText,
        attempt: nextAttempt,
        next_retry_at: null,
      }).eq("id", r.id);
      results.push({ id: r.id, outcome: "failed", http_status: discordStatus });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
