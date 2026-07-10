import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface LogRow {
  user_id: string;
  tournament_id: string | null;
  discord_id: string | null;
  role_id: string | null;
  source: string;
  status: "success" | "skipped" | "failed" | "retry_pending";
  reason: string | null;
  http_status: number | null;
  error_message: string | null;
  attempt?: number;
  next_retry_at?: string | null;
}

async function insertLog(
  admin: ReturnType<typeof createClient>,
  row: LogRow,
): Promise<string | null> {
  const { data, error } = await admin
    .from("discord_role_action_log")
    .insert(row)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("discord_role_action_log insert failed:", error);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const { tournament_id, user_id } = await req.json();
    if (!tournament_id || !user_id) {
      return json({ error: "Missing tournament_id or user_id" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Authorize: caller must be the target user OR admin/moderator
    if (callerId !== user_id) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId);
      const allowed = (roles ?? []).some((r: { role: string }) =>
        ["admin", "moderator"].includes(r.role),
      );
      if (!allowed) return json({ error: "Forbidden" }, 403);
    }

    const baseRow = {
      user_id,
      tournament_id,
      source: "tournament_register",
    };

    // ── Skip branches (each writes a log row) ─────────────────────
    const { data: tournament } = await admin
      .from("tournaments")
      .select("discord_role_id")
      .eq("id", tournament_id)
      .single();

    const roleId = (tournament as any)?.discord_role_id as string | null;
    if (!roleId) {
      const id = await insertLog(admin, {
        ...baseRow,
        discord_id: null,
        role_id: null,
        status: "skipped",
        reason: "no_discord_role_configured",
        http_status: null,
        error_message: null,
      });
      return json({ skipped: true, reason: "no_discord_role_configured", log_id: id });
    }

    const { data: reg } = await admin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournament_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (!reg) return json({ error: "User not registered for this tournament" }, 400);

    const { data: profile } = await admin
      .from("profiles")
      .select("discord_id")
      .eq("user_id", user_id)
      .single();

    const discordId = (profile as any)?.discord_id as string | null;
    if (!discordId) {
      const id = await insertLog(admin, {
        ...baseRow,
        discord_id: null,
        role_id: roleId,
        status: "skipped",
        reason: "user_not_linked",
        http_status: null,
        error_message: null,
      });
      return json({ skipped: true, reason: "user_not_linked", log_id: id });
    }

    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    if (!botToken || !guildId) {
      const id = await insertLog(admin, {
        ...baseRow,
        discord_id: discordId,
        role_id: roleId,
        status: "failed",
        reason: "bot_not_configured",
        http_status: null,
        error_message: "DISCORD_BOT_TOKEN or DISCORD_GUILD_ID missing",
      });
      return json({ error: "Discord bot not configured", log_id: id }, 500);
    }

    // ── Discord PUT ───────────────────────────────────────────────
    const discordRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const bodyText = (await discordRes.text().catch(() => "")).slice(0, 500);

    if (discordRes.ok) {
      const id = await insertLog(admin, {
        ...baseRow,
        discord_id: discordId,
        role_id: roleId,
        status: "success",
        reason: null,
        http_status: discordRes.status,
        error_message: null,
      });
      return json({ ok: true, log_id: id });
    }

    // Failure: classify retryable vs terminal
    const status = discordRes.status;
    const retryAfterHeader = discordRes.headers.get("Retry-After");
    const retryAfterSec = retryAfterHeader ? Math.max(1, parseInt(retryAfterHeader, 10) || 30) : null;

    const retryable = status === 429 || (status >= 500 && status < 600);
    if (retryable) {
      const delaySec = retryAfterSec ?? 30;
      const nextAt = new Date(Date.now() + delaySec * 1000).toISOString();
      const id = await insertLog(admin, {
        ...baseRow,
        discord_id: discordId,
        role_id: roleId,
        status: "retry_pending",
        reason: "discord_error",
        http_status: status,
        error_message: bodyText,
        attempt: 1,
        next_retry_at: nextAt,
      });
      return json({ ok: false, status: "retry_pending", http_status: status, log_id: id }, 202);
    }

    // Terminal (403 Missing Permissions, 404 Unknown Role/Member, etc.)
    console.error("Discord role assignment failed:", status, bodyText);
    const id = await insertLog(admin, {
      ...baseRow,
      discord_id: discordId,
      role_id: roleId,
      status: "failed",
      reason: "discord_error",
      http_status: status,
      error_message: bodyText,
    });
    return json({ ok: false, status: "failed", http_status: status, log_id: id }, 502);
  } catch (err) {
    console.error("assign-tournament-role error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
