import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Payload {
  type: "redemption_update" | "new_challenge" | "tournament_starting";
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
  target_email?: string; // For per-user sends (preference-aware triggers)
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
    const { type, record, old_record, target_email } = payload;

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
    }

    // Send via Resend (batch, max 100 at a time)
    let sent = 0;
    for (let i = 0; i < emails.length; i += 100) {
      const batch = emails.slice(i, i + 100);
      const promises = batch.map((e) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FGN <noreply@fgn.gg>",
            to: [e.to],
            subject: e.subject,
            html: e.html,
          }),
        })
      );
      await Promise.all(promises);
      sent += batch.length;
    }

    console.log(`Sent ${sent} notification emails for type: ${type}`);

    return new Response(
      JSON.stringify({ success: true, sent }),
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
