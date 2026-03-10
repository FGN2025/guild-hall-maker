import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Payload {
  type: "redemption_update" | "new_challenge" | "new_quest" | "tournament_starting" | "match_completed" | "achievement_earned" | "registration_confirmed" | "access_request_approved" | "access_request_new";
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
  target_email?: string;
  bypass_code?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: true, message: "RESEND_API_KEY not configured, skipping email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: Payload = await req.json();
    const { type, record, old_record, target_email, bypass_code } = payload;

    const emails: { to: string; subject: string; html: string }[] = [];

    if (type === "redemption_update") {
      const newStatus = record.status as string;
      const oldStatus = old_record?.status as string | undefined;
      if (oldStatus === newStatus || !["approved", "fulfilled", "denied"].includes(newStatus)) {
        return new Response(JSON.stringify({ success: true, message: "No email needed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = record.user_id as string;
      const prizeId = record.prize_id as string;

      const { data: prize } = await supabase.from("prizes").select("name").eq("id", prizeId).single();
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email;
      if (!userEmail) {
        return new Response(JSON.stringify({ success: true, message: "No email for user" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prizeName = prize?.name ?? "a prize";
      const statusEmoji = newStatus === "denied" ? "❌" : "✅";

      emails.push({
        to: userEmail,
        subject: `${statusEmoji} Prize Redemption ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} — FGN`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
            <h1 style="color: #00f0ff;">Prize Redemption Update</h1>
            <p>Your redemption request for <strong>"${prizeName}"</strong> has been <strong>${newStatus}</strong>.</p>
            ${newStatus === "approved" ? "<p>🎉 Congratulations! Your prize is being prepared.</p>" : ""}
            ${newStatus === "fulfilled" ? "<p>📦 Your prize has been fulfilled and delivered!</p>" : ""}
            ${newStatus === "denied" ? "<p>Unfortunately, your request was denied. Check the Prize Shop for details.</p>" : ""}
            <p style="color: #888; font-size: 12px;">— FGN Platform</p>
          </div>`,
      });
    } else if (type === "new_challenge") {
      const challengeName = record.name as string;
      const pointsReward = record.points_reward as number;

      // If target_email is provided, send to just that user (preference-aware trigger)
      if (target_email) {
        emails.push({
          to: target_email,
          subject: `🎯 New Challenge Available — FGN`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
              <h1 style="color: #00f0ff;">New Challenge Available!</h1>
              <p>A new challenge <strong>"${challengeName}"</strong> is now live!</p>
              <p>Complete it to earn <strong>${pointsReward} points</strong>.</p>
              <p>Log in to FGN and check the Challenges page to get started.</p>
              <p style="color: #888; font-size: 12px;">— FGN Platform</p>
            </div>`,
        });
      } else {
        // Legacy: send to all users (no preference check)
        const { data: userData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (userData?.users) {
          for (const u of userData.users) {
            if (u.email) {
              emails.push({
                to: u.email,
                subject: `🎯 New Challenge Available — FGN`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                    <h1 style="color: #00f0ff;">New Challenge Available!</h1>
                    <p>A new challenge <strong>"${challengeName}"</strong> is now live!</p>
                    <p>Complete it to earn <strong>${pointsReward} points</strong>.</p>
                    <p>Log in to FGN and check the Challenges page to get started.</p>
                    <p style="color: #888; font-size: 12px;">— FGN Platform</p>
                  </div>`,
              });
            }
          }
        }
      }
    } else if (type === "tournament_starting") {
      const tournamentName = record.name as string;
      const tournamentId = record.id as string;

      if (target_email) {
        emails.push({
          to: target_email,
          subject: `🏁 Tournament Starting Now — ${tournamentName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
              <h1 style="color: #00f0ff;">🏁 Tournament Starting!</h1>
              <p>The tournament <strong>"${tournamentName}"</strong> is now live!</p>
              <p>Head over to the bracket page to see your first match and get ready to compete!</p>
              <p style="color: #888; font-size: 12px;">— FGN Platform</p>
            </div>`,
        });
      }
    } else if (type === "match_completed") {
      const tournamentName = (payload as any).tournament_name as string ?? "a tournament";
      const winnerId = record.winner_id as string | null;
      const round = record.round as number;

      if (target_email) {
        const isWinner = target_email ? true : false; // trigger sends per-player
        emails.push({
          to: target_email,
          subject: `📊 Match Result — Round ${round} in ${tournamentName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
              <h1 style="color: #00f0ff;">📊 Match Result</h1>
              <p>A Round ${round} match in <strong>"${tournamentName}"</strong> has been completed.</p>
              <p><strong>Score:</strong> ${record.player1_score ?? "—"} vs ${record.player2_score ?? "—"}</p>
              <p>Check the bracket page for your next match details.</p>
              <p style="color: #888; font-size: 12px;">— FGN Platform</p>
            </div>`,
        });
      }
    } else if (type === "achievement_earned") {
      const achievementName = (payload as any).achievement_name as string ?? "an achievement";
      const achievementTier = (payload as any).achievement_tier as string ?? "bronze";
      const tierEmoji = achievementTier === "platinum" ? "💎" : achievementTier === "gold" ? "🥇" : achievementTier === "silver" ? "🥈" : "🥉";

      if (target_email) {
        emails.push({
          to: target_email,
          subject: `${tierEmoji} Achievement Unlocked — ${achievementName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
              <h1 style="color: #00f0ff;">🏆 Achievement Unlocked!</h1>
              <p>You've earned the <strong>${achievementTier.charAt(0).toUpperCase() + achievementTier.slice(1)}</strong> achievement:</p>
              <p style="font-size: 18px; font-weight: bold;">${tierEmoji} ${achievementName}</p>
              <p>Visit your profile to see all your achievements.</p>
              <p style="color: #888; font-size: 12px;">— FGN Platform</p>
            </div>`,
        });
      }
    } else if (type === "registration_confirmed") {
      const tournamentName = (payload as any).tournament_name as string ?? "a tournament";

      if (target_email) {
        emails.push({
          to: target_email,
          subject: `✅ Registration Confirmed — ${tournamentName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
              <h1 style="color: #00f0ff;">✅ Registration Confirmed!</h1>
              <p>You are now registered for <strong>"${tournamentName}"</strong>.</p>
              <p>Keep an eye out for updates — we'll notify you when the tournament goes live!</p>
              <p>Good luck! 🎮</p>
              <p style="color: #888; font-size: 12px;">— FGN Platform</p>
            </div>`,
        });
      }
    } else if (type === "access_request_approved") {
      if (target_email && bypass_code) {
        emails.push({
          to: target_email,
          subject: `✅ Your FGN Access Request Has Been Approved!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
              <h1 style="color: #00f0ff;">Access Request Approved!</h1>
              <p>Great news! Your request to join the FGN platform has been approved.</p>
              <p>Use the following invite code to complete your registration:</p>
              <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">${bypass_code}</span>
              </div>
              <p>Go to the <a href="https://guild-hall-maker.lovable.app/auth" style="color: #00f0ff;">FGN registration page</a> and enter this code to get started.</p>
              <p style="color: #888; font-size: 12px;">This code is single-use. — FGN Platform</p>
            </div>`,
        });
      }
    } else if (type === "new_quest") {
      const questName = record.name as string;
      const pointsReward = record.points_reward as number;

      if (target_email) {
        emails.push({
          to: target_email,
          subject: `🗺️ New Quest Available — FGN`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
              <h1 style="color: #00f0ff;">New Quest Available!</h1>
              <p>A new quest <strong>"${questName}"</strong> is now live!</p>
              <p>Complete it to earn <strong>${pointsReward} points</strong>.</p>
              <p>Log in to FGN and check the Quests page to get started.</p>
              <p style="color: #888; font-size: 12px;">— FGN Platform</p>
            </div>`,
        });
      } else {
        const { data: userData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (userData?.users) {
          for (const u of userData.users) {
            if (u.email) {
              emails.push({
                to: u.email,
                subject: `🗺️ New Quest Available — FGN`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                    <h1 style="color: #00f0ff;">New Quest Available!</h1>
                    <p>A new quest <strong>"${questName}"</strong> is now live!</p>
                    <p>Complete it to earn <strong>${pointsReward} points</strong>.</p>
                    <p>Log in to FGN and check the Quests page to get started.</p>
                    <p style="color: #888; font-size: 12px;">— FGN Platform</p>
                  </div>`,
              });
            }
          }
        }
      }
    } else if (type === "access_request_new") {
      // Notify all admins about new access request
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles) {
        for (const role of adminRoles) {
          const { data: userData } = await supabase.auth.admin.getUserById(role.user_id);
          if (userData?.user?.email) {
            const rec = record || {};
            emails.push({
              to: userData.user.email,
              subject: `📋 New Access Request — FGN`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                  <h1 style="color: #00f0ff;">New Access Request</h1>
                  <p>A new user is requesting access to the FGN platform:</p>
                  <ul>
                    <li><strong>Name:</strong> ${rec.display_name || "Not provided"}</li>
                    <li><strong>Email:</strong> ${rec.email || "Unknown"}</li>
                    <li><strong>ZIP Code:</strong> ${rec.zip_code || "Unknown"}</li>
                  </ul>
                  <p>Review this request in the <a href="https://guild-hall-maker.lovable.app/admin/access-requests" style="color: #00f0ff;">Admin Panel</a>.</p>
                  <p style="color: #888; font-size: 12px;">— FGN Platform</p>
                </div>`,
            });
          }
        }
      }
    }

    // Send via Resend (batch, max 100 at a time)
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < emails.length; i += 100) {
      const batch = emails.slice(i, i + 100);
      const promises = batch.map(async (e) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FGN <noreply@play.fgn.gg>",
            to: [e.to],
            subject: e.subject,
            html: e.html,
          }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          console.error(`Resend API error for ${e.to}: ${res.status} ${errBody}`);
          return false;
        }
        return true;
      });
      const results = await Promise.all(promises);
      const batchSent = results.filter(Boolean).length;
      const batchFailed = results.length - batchSent;
      sent += batchSent;
      failed += batchFailed;
    }

    console.log(`Sent ${sent} notification emails for type: ${type}${failed > 0 ? `, ${failed} failed` : ""}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
