import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailPayload {
  type: "tournament_started" | "score_posted" | "player_advanced";
  tournament_id: string;
  match_id?: string;
  winner_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: EmailPayload = await req.json();
    const { type, tournament_id, match_id, winner_id } = payload;

    // Get tournament info
    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .select("name, game, format")
      .eq("id", tournament_id)
      .single();

    if (tErr || !tournament) {
      throw new Error(`Tournament not found: ${tErr?.message}`);
    }

    let recipients: { email: string; name: string }[] = [];
    let subject = "";
    let htmlBody = "";

    switch (type) {
      case "tournament_started": {
        // Get all registered players' emails
        const { data: regs } = await supabase
          .from("tournament_registrations")
          .select("user_id")
          .eq("tournament_id", tournament_id)
          .eq("status", "registered");

        if (regs && regs.length > 0) {
          const userIds = regs.map((r) => r.user_id);
          const { data: users } = await supabase.auth.admin.listUsers();

          if (users?.users) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, display_name, gamer_tag")
              .in("user_id", userIds);

            recipients = users.users
              .filter((u) => userIds.includes(u.id) && u.email)
              .map((u) => {
                const profile = profiles?.find((p) => p.user_id === u.id);
                return {
                  email: u.email!,
                  name: profile?.gamer_tag || profile?.display_name || u.email!,
                };
              });
          }
        }

        subject = `🏁 ${tournament.name} has started!`;
        htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #00f0ff;">🏁 Tournament Started!</h1>
            <p>The tournament <strong>${tournament.name}</strong> is now live!</p>
            <p><strong>Game:</strong> ${tournament.game}<br/>
            <strong>Format:</strong> ${tournament.format.replace("_", " ")}</p>
            <p>Head over to the bracket page to see your first match and get ready to compete!</p>
            <p style="color: #888; font-size: 12px;">— FGN Tournament Platform</p>
          </div>`;
        break;
      }

      case "score_posted": {
        if (!match_id) throw new Error("match_id required for score_posted");

        const { data: match } = await supabase
          .from("match_results")
          .select("*")
          .eq("id", match_id)
          .single();

        if (!match) throw new Error("Match not found");

        const playerIds = [match.player1_id, match.player2_id].filter(Boolean) as string[];
        if (playerIds.length === 0) break;

        const { data: users } = await supabase.auth.admin.listUsers();
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, gamer_tag")
          .in("user_id", playerIds);

        if (users?.users) {
          recipients = users.users
            .filter((u) => playerIds.includes(u.id) && u.email)
            .map((u) => {
              const profile = profiles?.find((p) => p.user_id === u.id);
              return {
                email: u.email!,
                name: profile?.gamer_tag || profile?.display_name || u.email!,
              };
            });
        }

        const p1Name = profiles?.find((p) => p.user_id === match.player1_id)?.gamer_tag || "Player 1";
        const p2Name = profiles?.find((p) => p.user_id === match.player2_id)?.gamer_tag || "Player 2";

        subject = `📊 Match Score Posted — ${tournament.name}`;
        htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #00f0ff;">📊 Match Score Posted</h1>
            <p>A match result has been recorded in <strong>${tournament.name}</strong>:</p>
            <div style="background: #1a1a2e; color: #fff; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="text-align: center; font-size: 18px; margin: 0;">
                <strong>${p1Name}</strong> ${match.player1_score ?? "—"} vs ${match.player2_score ?? "—"} <strong>${p2Name}</strong>
              </p>
            </div>
            ${match.winner_id ? `<p>🏆 Winner: <strong>${match.winner_id === match.player1_id ? p1Name : p2Name}</strong></p>` : ""}
            <p style="color: #888; font-size: 12px;">— FGN Tournament Platform</p>
          </div>`;
        break;
      }

      case "player_advanced": {
        if (!winner_id) throw new Error("winner_id required for player_advanced");

        const { data: users } = await supabase.auth.admin.listUsers();
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, gamer_tag")
          .eq("user_id", winner_id);

        const winner = users?.users?.find((u) => u.id === winner_id);
        const winnerProfile = profiles?.[0];

        if (winner?.email) {
          recipients = [{
            email: winner.email,
            name: winnerProfile?.gamer_tag || winnerProfile?.display_name || winner.email,
          }];
        }

        subject = `⬆️ You advanced to the next round — ${tournament.name}`;
        htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #00f0ff;">⬆️ Congratulations!</h1>
            <p>You've won your match and advanced to the next round in <strong>${tournament.name}</strong>!</p>
            <p>Check the bracket to see your next opponent. Good luck!</p>
            <p style="color: #888; font-size: 12px;">— FGN Tournament Platform</p>
          </div>`;
        break;
      }

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No recipients found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send emails via Resend
    const emailPromises = recipients.map((recipient) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FGN <noreply@play.fgn.gg>",
          to: [recipient.email],
          subject,
          html: htmlBody.replace("{{name}}", recipient.name),
        }),
      }).then(async (res) => {
        const body = await res.text();
        if (!res.ok) {
          console.error(`Resend API error for ${recipient.email}: ${res.status} ${body}`);
        }
        return { email: recipient.email, status: res.status, body, ok: res.ok };
      })
    );

    const results = await Promise.all(emailPromises);
    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;

    console.log(`Tournament email results: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
