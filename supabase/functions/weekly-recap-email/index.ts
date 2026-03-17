import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();

    // Get all profiles with activity in last 30 days
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .or(`last_active_at.gte.${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()},last_active_at.is.null`);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;

    for (const profile of profiles) {
      const uid = profile.user_id;

      // Check dedup — skip if already sent this week
      const { data: existing } = await supabase
        .from("engagement_email_log")
        .select("id")
        .eq("user_id", uid)
        .eq("email_type", "weekly_recap")
        .gte("sent_at", weekAgoISO)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Check preference
      const { data: pref } = await supabase
        .from("notification_preferences")
        .select("email_enabled")
        .eq("user_id", uid)
        .eq("notification_type", "weekly_recap")
        .single();

      if (pref?.email_enabled === false) continue;

      // Gather stats
      const [challengeRes, questRes, matchRes, achievementRes] = await Promise.all([
        supabase.from("challenge_completions").select("id", { count: "exact", head: true })
          .eq("user_id", uid).gte("completed_at", weekAgoISO),
        supabase.from("quest_completions").select("id", { count: "exact", head: true })
          .eq("user_id", uid).gte("completed_at", weekAgoISO),
        supabase.from("match_results").select("id", { count: "exact", head: true })
          .or(`player1_id.eq.${uid},player2_id.eq.${uid}`).gte("completed_at", weekAgoISO),
        supabase.from("player_achievements").select("id", { count: "exact", head: true })
          .eq("user_id", uid).gte("awarded_at", weekAgoISO),
      ]);

      const challenges = challengeRes.count ?? 0;
      const quests = questRes.count ?? 0;
      const matches = matchRes.count ?? 0;
      const achievements = achievementRes.count ?? 0;

      // Skip if zero activity
      if (challenges + quests + matches + achievements === 0) continue;

      // Get email
      const { data: userData } = await supabase.auth.admin.getUserById(uid);
      const email = userData?.user?.email;
      if (!email) continue;

      const displayName = profile.display_name || "Player";

      // Send email
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "FGN <noreply@play.fgn.gg>",
          to: [email],
          subject: `Your Weekly Recap — ${displayName}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#e5e7eb;padding:32px;border-radius:12px;">
              <h1 style="color:#a855f7;font-size:24px;margin-bottom:8px;">🎮 Your Weekly Recap</h1>
              <p style="color:#9ca3af;margin-bottom:24px;">Hey ${displayName}, here's what you accomplished this week on FGN:</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                ${matches > 0 ? `<tr><td style="padding:8px 0;color:#d1d5db;">🏆 Matches Played</td><td style="padding:8px 0;text-align:right;color:#a855f7;font-weight:bold;">${matches}</td></tr>` : ""}
                ${challenges > 0 ? `<tr><td style="padding:8px 0;color:#d1d5db;">⚡ Challenges Completed</td><td style="padding:8px 0;text-align:right;color:#a855f7;font-weight:bold;">${challenges}</td></tr>` : ""}
                ${quests > 0 ? `<tr><td style="padding:8px 0;color:#d1d5db;">📜 Quests Completed</td><td style="padding:8px 0;text-align:right;color:#a855f7;font-weight:bold;">${quests}</td></tr>` : ""}
                ${achievements > 0 ? `<tr><td style="padding:8px 0;color:#d1d5db;">🏅 Achievements Earned</td><td style="padding:8px 0;text-align:right;color:#a855f7;font-weight:bold;">${achievements}</td></tr>` : ""}
              </table>
              <div style="text-align:center;">
                <a href="https://guild-hall-maker.lovable.app/leaderboard" style="display:inline-block;background:#a855f7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:8px;">View Leaderboard</a>
                <a href="https://guild-hall-maker.lovable.app/challenges" style="display:inline-block;background:#6b21a8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Browse Challenges</a>
              </div>
              <p style="color:#6b7280;font-size:12px;margin-top:32px;text-align:center;">You're receiving this because you have email notifications enabled. Manage preferences in your profile settings.</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        await supabase.from("engagement_email_log").insert({ user_id: uid, email_type: "weekly_recap" });
        sent++;
      } else {
        console.error(`Failed to send recap to ${email}:`, await res.text());
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("weekly-recap-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
