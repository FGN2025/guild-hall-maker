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

const UUID = /^[0-9a-f-]{36}$/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Admin = ReturnType<typeof createClient>;

async function logAttempt(admin: Admin, row: Record<string, unknown>) {
  const { error } = await admin.from("discord_role_action_log").insert(row);
  if (error) console.error("role log insert failed:", error.message);
}

async function notifyNotInServer(admin: Admin, userId: string, tournamentId: string, tournamentName: string) {
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "discord_not_in_server")
    .eq("related_id", tournamentId)
    .limit(1);
  if ((existing ?? []).length > 0) return;
  const { data: invite } = await admin
    .from("app_settings").select("value").eq("key", "discord_invite_url").maybeSingle();
  await admin.from("notifications").insert({
    user_id: userId,
    type: "discord_not_in_server",
    category: "tournament",
    related_kind: "tournament",
    related_id: tournamentId,
    title: "Not in server, please register",
    message: `You're not in the FGN Discord server yet. Please join so we can give you your role for ${tournamentName}.`,
    link: invite?.value || `/tournaments/${tournamentId}`,
  });
}

export async function assignOne(
  admin: Admin,
  tournamentId: string,
  userId: string,
  source: string,
): Promise<{ status: string; reason?: string; http_status?: number; error?: string }> {
  const { data: t } = await admin
    .from("tournaments").select("name, discord_role_id").eq("id", tournamentId).maybeSingle();
  if (!t?.discord_role_id) return { status: "skipped", reason: "no_role_configured" };

  const { data: reg } = await admin
    .from("tournament_registrations").select("id")
    .eq("tournament_id", tournamentId).eq("user_id", userId).maybeSingle();
  if (!reg) return { status: "skipped", reason: "not_registered" };

  const { data: profile } = await admin
    .from("profiles").select("discord_id").eq("user_id", userId).maybeSingle();
  const base = { user_id: userId, tournament_id: tournamentId, role_id: t.discord_role_id, source };
  if (!profile?.discord_id) {
    await logAttempt(admin, { ...base, status: "skipped", reason: "no_discord_link" });
    return { status: "skipped", reason: "no_discord_link" };
  }

  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
  const guildId = Deno.env.get("DISCORD_GUILD_ID");
  if (!botToken || !guildId) {
    await logAttempt(admin, { ...base, discord_id: profile.discord_id, status: "failed", reason: "bot_not_configured" });
    return { status: "failed", reason: "bot_not_configured" };
  }

  let res: Response | null = null;
  for (let i = 0; i < 3; i++) {
    res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${profile.discord_id}/roles/${t.discord_role_id}`,
      { method: "PUT", headers: { Authorization: `Bot ${botToken}`, "X-Audit-Log-Reason": "FGN tournament registration" } },
    );
    if (res.status !== 429) break;
    const wait = Number(res.headers.get("Retry-After") ?? "1");
    await sleep(Math.min(5, Math.max(0.5, wait)) * 1000);
  }
  const httpStatus = res!.status;
  const body = res!.ok ? "" : await res!.text();
  let code: number | undefined;
  try { code = body ? JSON.parse(body).code : undefined; } catch { /* ignore */ }

  const withDiscord = { ...base, discord_id: profile.discord_id, http_status: httpStatus };
  if (res!.ok) {
    await logAttempt(admin, { ...withDiscord, status: "success" });
    return { status: "success", http_status: httpStatus };
  }
  let reason = "discord_error";
  let status = "failed";
  if (code === 10007 || (httpStatus === 404 && body.includes("Member"))) { reason = "not_in_guild"; status = "skipped"; }
  else if (code === 10011) reason = "role_missing";
  else if (httpStatus === 403 || code === 50013) reason = "permissions";
  else if (httpStatus === 429) reason = "rate_limited";
  console.error(`role assign ${reason}: status=${httpStatus} body=${body}`);
  await logAttempt(admin, { ...withDiscord, status, reason, error_message: body.slice(0, 500) });
  if (reason === "not_in_guild") await notifyNotInServer(admin, userId, tournamentId, t.name);
  return { status, reason, http_status: httpStatus, error: body.slice(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const body = await req.json().catch(() => ({}));

    // Trigger mode: fired by the database on a new registration. Only acts on
    // a registration created in the last 10 minutes, for that registrant only.
    if (body.registration_id) {
      if (!UUID.test(String(body.registration_id))) return json({ error: "Invalid registration_id" }, 400);
      const { data: reg } = await admin
        .from("tournament_registrations").select("tournament_id, user_id, registered_at")
        .eq("id", body.registration_id).maybeSingle();
      if (!reg) return json({ error: "Registration not found" }, 404);
      if (Date.now() - new Date(reg.registered_at).getTime() > 10 * 60 * 1000) {
        return json({ error: "Registration too old for trigger mode" }, 403);
      }
      return json(await assignOne(admin, reg.tournament_id, reg.user_id, "registration"));
    }

    // User mode: caller must be authenticated.
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isStaff = (roles ?? []).some((r: { role: string }) => ["admin", "moderator"].includes(r.role));

    // Admin backfill: all linked registrants of open/upcoming tournaments.
    if (body.action === "backfill") {
      if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) return json({ error: "Forbidden" }, 403);
      const { data: ts } = await admin
        .from("tournaments").select("id")
        .in("status", ["upcoming", "open"]).not("discord_role_id", "is", null);
      const ids = (ts ?? []).map((t: { id: string }) => t.id);
      if (ids.length === 0) return json({ processed: 0, results: {} });
      const { data: regs } = await admin
        .from("tournament_registrations").select("tournament_id, user_id").in("tournament_id", ids).limit(500);
      const counts: Record<string, number> = {};
      for (const r of regs ?? []) {
        const out = await assignOne(admin, r.tournament_id, r.user_id, "backfill");
        const k = `${out.status}${out.reason ? ":" + out.reason : ""}`;
        counts[k] = (counts[k] ?? 0) + 1;
        await sleep(250);
      }
      return json({ processed: (regs ?? []).length, results: counts });
    }

    const { tournament_id, user_id } = body;
    if (!UUID.test(String(tournament_id ?? "")) || !UUID.test(String(user_id ?? ""))) {
      return json({ error: "Missing or invalid tournament_id / user_id" }, 400);
    }
    if (callerId !== user_id && !isStaff) return json({ error: "Forbidden" }, 403);
    return json(await assignOne(admin, tournament_id, user_id, callerId === user_id ? "self_retry" : "staff"));
  } catch (err) {
    console.error("assign-tournament-role error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
