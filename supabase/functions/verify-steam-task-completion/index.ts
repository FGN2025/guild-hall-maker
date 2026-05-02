import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const STEAM_API_BASE = "https://api.steampowered.com";

interface ReqBody {
  taskId: string;
  enrollmentId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const steamApiKey = Deno.env.get("STEAM_API_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body?.taskId || !body?.enrollmentId) {
      return json({ error: "taskId and enrollmentId are required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Load task + challenge + game
    const { data: task, error: taskErr } = await admin
      .from("challenge_tasks")
      .select("id, challenge_id, title, verification_type, steam_achievement_api_name, steam_playtime_minutes")
      .eq("id", body.taskId)
      .single();
    if (taskErr || !task) return json({ error: "Task not found" }, 404);

    if (task.verification_type === "manual") {
      return json({ ok: false, reason: "Task is manual verification only" }, 400);
    }

    const { data: challenge } = await admin
      .from("challenges")
      .select("id, game_id")
      .eq("id", task.challenge_id)
      .single();
    if (!challenge?.game_id) {
      return json({ ok: false, reason: "Challenge has no associated game" }, 400);
    }

    const { data: game } = await admin
      .from("games")
      .select("steam_app_id, name")
      .eq("id", challenge.game_id)
      .single();
    if (!game?.steam_app_id) {
      return json({ ok: false, reason: "Game has no Steam App ID" }, 400);
    }
    const steamAppId = game.steam_app_id;

    // Verify the enrollment belongs to this user
    const { data: enrollment } = await admin
      .from("challenge_enrollments")
      .select("id, user_id, status")
      .eq("id", body.enrollmentId)
      .single();
    if (!enrollment || enrollment.user_id !== userId) {
      return json({ error: "Enrollment not found" }, 404);
    }

    // Get user steam_id
    const { data: profile } = await admin
      .from("profiles")
      .select("steam_id")
      .eq("user_id", userId)
      .single();
    if (!profile?.steam_id) {
      return json({ ok: false, reasonCode: "not_linked", reason: "Steam account not linked" }, 400);
    }
    const steamId = profile.steam_id;

    // Already submitted evidence for this task?
    const { data: existing } = await admin
      .from("challenge_evidence")
      .select("id, status")
      .eq("enrollment_id", body.enrollmentId)
      .eq("task_id", body.taskId)
      .maybeSingle();
    if (existing && existing.status === "approved") {
      return json({ ok: true, alreadyApproved: true });
    }

    let passed = false;
    let progressMessage = "";
    let reasonCode: string | undefined;
    let details: Record<string, unknown> | undefined;
    let evidenceUrl = `https://steamcommunity.com/profiles/${steamId}`;

    if (task.verification_type === "steam_achievement") {
      // Pull achievements for this app
      const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v0001?appid=${steamAppId}&key=${steamApiKey}&steamid=${steamId}&format=json`;
      let res: Response;
      try {
        res = await fetch(url);
      } catch (_e) {
        return json({ ok: false, reasonCode: "api_error", reason: "Couldn't reach Steam right now. Try again in a moment." }, 200);
      }
      if (!res.ok) {
        return json({
          ok: false,
          reasonCode: "api_error",
          reason: `Steam returned an error (${res.status}). Try again shortly.`,
        }, 200);
      }
      const j = await res.json().catch(() => null);
      if (!j?.playerstats?.success || !j?.playerstats?.achievements) {
        return json({
          ok: false,
          reasonCode: "profile_private",
          reason: "Your Steam profile or game details are private. Set them to public to enable auto-verification.",
        }, 200);
      }
      const now = new Date().toISOString();
      const rows = j.playerstats.achievements.map((a: any) => ({
        user_id: userId,
        steam_app_id: steamAppId,
        achievement_api_name: a.apiname,
        achieved: a.achieved === 1,
        unlock_time: a.unlocktime > 0 ? new Date(a.unlocktime * 1000).toISOString() : null,
        synced_at: now,
      }));
      if (rows.length) {
        await admin.from("steam_player_achievements").upsert(rows, {
          onConflict: "user_id,steam_app_id,achievement_api_name",
        });
      }
      const target = j.playerstats.achievements.find(
        (a: any) => a.apiname === task.steam_achievement_api_name
      );
      if (target?.achieved === 1) {
        passed = true;
        evidenceUrl = `https://steamcommunity.com/profiles/${steamId}/stats/${steamAppId}/achievements/`;
      } else {
        reasonCode = "achievement_locked";
        progressMessage = `Achievement "${task.steam_achievement_api_name}" hasn't been unlocked on your Steam account yet.`;
        details = { achievement: task.steam_achievement_api_name };
      }
    } else if (task.verification_type === "steam_playtime") {
      const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=false&include_played_free_games=true&format=json&appids_filter[0]=${steamAppId}`;
      let res: Response;
      try {
        res = await fetch(url);
      } catch (_e) {
        return json({ ok: false, reasonCode: "api_error", reason: "Couldn't reach Steam right now. Try again in a moment." }, 200);
      }
      if (!res.ok) {
        return json({
          ok: false,
          reasonCode: "api_error",
          reason: `Steam returned an error (${res.status}). Try again shortly.`,
        }, 200);
      }
      const j = await res.json().catch(() => null);
      const owned = j?.response?.games?.[0];
      if (!owned) {
        return json({
          ok: false,
          reasonCode: "game_not_owned",
          reason: "We couldn't find this game in your Steam library, or your library is set to private.",
        }, 200);
      }
      const minutes = owned.playtime_forever ?? 0;
      await admin.from("steam_player_playtime").upsert(
        {
          user_id: userId,
          steam_app_id: steamAppId,
          minutes_played: minutes,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,steam_app_id" }
      );
      const required = task.steam_playtime_minutes ?? 0;
      if (minutes >= required) {
        passed = true;
      } else {
        reasonCode = "insufficient_playtime";
        progressMessage = `You've played ${minutes} of ${required} required minutes (${Math.max(0, required - minutes)} to go).`;
        details = { minutes, required, remaining: Math.max(0, required - minutes) };
      }
    }

    if (!passed) {
      return json({ ok: false, reasonCode: reasonCode ?? "not_met", reason: progressMessage || "Criteria not met yet.", details }, 200);
    }

    // Auto-approve: insert (or update) evidence row as approved.
    if (existing) {
      const { error: updErr } = await admin
        .from("challenge_evidence")
        .update({
          file_url: evidenceUrl,
          file_type: "steam_auto",
          status: "approved",
          reviewer_notes: "Auto-verified via Steam.",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await admin.from("challenge_evidence").insert({
        enrollment_id: body.enrollmentId,
        task_id: body.taskId,
        file_url: evidenceUrl,
        file_type: "steam_auto",
        status: "approved",
        reviewer_notes: "Auto-verified via Steam.",
        reviewed_at: new Date().toISOString(),
        notes: `Steam ${task.verification_type === "steam_achievement" ? "achievement" : "playtime"} verified for ${game.name}.`,
      });
      if (insErr) throw insErr;
    }

    return json({ ok: true, autoApproved: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
