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
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Find users inactive 14-90 days
    const { data: inactiveProfiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, last_active_at")
      .not("last_active_at", "is", null)
      .lte("last_active_at", fourteenDaysAgo.toISOString())
      .gte("last_active_at", ninetyDaysAgo.toISOString());

    if (!inactiveProfiles || inactiveProfiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get counts of new content since 14 days ago
    const [tournamentsRes, challengesRes, questsRes] = await Promise.all([
      supabase.from("tournaments").select("id", { count: "exact", head: true })
        .in("status", ["open", "upcoming"]).gte("created_at", fourteenDaysAgo.toISOString()),
      supabase.from("challenges").select("id", { count: "exact", head: true })
        .eq("is_active", true).gte("created_at", fourteenDaysAgo.toISOString()),
      supabase.from("quests").select("id", { count: "exact", head: true })
        .eq("is_active", true).gte("created_at", fourteenDaysAgo.toISOString()),
    ]);

    const newTournaments = tournamentsRes.count ?? 0;
    const newChallenges = challengesRes.count ?? 0;
    const newQuests = questsRes.count ?? 0;

    if (newTournaments + newChallenges + newQuests === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no new content" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const p of inactiveProfiles) {
      // Dedup: max one re-engagement per 14 days
      const { data: existing } = await supabase
        .from("engagement_email_log")
        .select("id")
        .eq("user_id", p.user_id)
        .eq("email_type", "reengagement")
        .gte("sent_at", fourteenDaysAgo.toISOString())
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Preference check
      const { data: pref } = await supabase
        .from("notification_preferences")
        .select("email_enabled")
        .eq("user_id", p.user_id)
        .eq("notification_type", "reengagement")
        .single();

      if (pref?.email_enabled === false) continue;

      // Get email
      const { data: userData } = await supabase.auth.admin.getUserById(p.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const displayName = p.display_name || "Player";
      const highlights: string[] = [];
      if (newTournaments > 0) highlights.push(`🏆 <strong>${newTournaments}</strong> new tournament${newTournaments > 1 ? "s" : ""}`);
      if (newChallenges > 0) highlights.push(`⚡ <strong>${newChallenges}</strong> new challenge${newChallenges > 1 ? "s" : ""}`);
      if (newQuests > 0) highlights.push(`📜 <strong>${newQuests}</strong> new quest${newQuests > 1 ? "s" : ""}`);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "FGN <noreply@play.fgn.gg>",
          to: [email],
          subject: `We miss you, ${displayName}! Here's what's new on FGN`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#e5e7eb;padding:32px;border-radius:12px;">
              <h1 style="color:#a855f7;font-size:24px;margin-bottom:8px;">👋 We miss you!</h1>
              <p style="color:#9ca3af;margin-bottom:16px;">Hey ${displayName},</p>
              <p style="color:#d1d5db;margin-bottom:24px;">It's been a while since we've seen you on FGN. Here's what you've been missing:</p>
              <div style="background:#1f2937;padding:16px;border-radius:8px;margin-bottom:24px;">
                ${highlights.map(h => `<p style="color:#d1d5db;margin:4px 0;">${h}</p>`).join("")}
              </div>
              <div style="text-align:center;margin-bottom:24px;">
                <a href="https://guild-hall-maker.lovable.app/dashboard" style="display:inline-block;background:#a855f7;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Jump Back In</a>
              </div>
              <p style="color:#6b7280;font-size:12px;text-align:center;">You're receiving this because you have re-engagement emails enabled. Manage preferences in your profile settings.</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        await supabase.from("engagement_email_log").insert({ user_id: p.user_id, email_type: "reengagement" });
        sent++;
      } else {
        console.error(`Failed to send reengagement to ${email}:`, await res.text());
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("reengagement-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
