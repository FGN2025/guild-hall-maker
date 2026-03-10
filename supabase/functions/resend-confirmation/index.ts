import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing required field: email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate a fresh signup confirmation link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: "https://guild-hall-maker.lovable.app/auth",
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("generateLink error:", linkError);
      return new Response(
        JSON.stringify({ error: linkError?.message || "Failed to generate confirmation link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const confirmationUrl = linkData.properties.action_link;
    const logoUrl = "https://yrhwzmkenjgiujhofucx.supabase.co/storage/v1/object/public/email-assets/fgn-logo.png";
    const siteUrl = "https://guild-hall-maker.lovable.app";

    const html = `
      <div style="font-family: 'Rajdhani', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background-color: #0a0d14; padding: 24px 25px 16px; text-align: center;">
          <img src="${logoUrl}" alt="FGN" width="120" style="margin: 0 auto;" />
        </div>
        <h1 style="font-size: 22px; font-weight: bold; font-family: 'Orbitron', 'Rajdhani', Arial, sans-serif; color: #0a0d14; margin: 24px 25px 16px;">
          Welcome to the arena, player.
        </h1>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 25px 20px;">
          You signed up for <a href="${siteUrl}" style="color: #00b8b8; text-decoration: underline;"><strong>FGN — Fibre Gaming Network</strong></a>.
          One last step before you can compete.
        </p>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 25px 20px;">
          Confirm your email (<strong>${email}</strong>) to unlock tournaments, leaderboards, and challenges.
        </p>
        <a href="${confirmationUrl}" style="display: block; background-color: #00e6e6; color: #0a0d14; font-size: 15px; font-weight: bold; font-family: 'Orbitron', 'Rajdhani', Arial, sans-serif; border-radius: 8px; padding: 14px 28px; text-decoration: none; text-align: center; margin: 8px 25px 28px;">
          Verify &amp; Enter
        </a>
        <p style="font-size: 12px; color: #999; margin: 0 25px 24px;">
          Didn't create an FGN account? You can safely ignore this email.
        </p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FGN <noreply@play.fgn.gg>",
        to: [email],
        subject: "Confirm your FGN account",
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Confirmation email resent to", email, result);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Resend confirmation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
