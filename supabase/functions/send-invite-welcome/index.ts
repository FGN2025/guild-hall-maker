const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, message: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, tenantName, role } = await req.json();

    if (!email || !tenantName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, tenantName, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const siteUrl = "https://play.fgn.gg";
    const logoUrl = "https://yrhwzmkenjgiujhofucx.supabase.co/storage/v1/object/public/email-assets/fgn-logo.png";

    const dashboardUrl = `${siteUrl}/tenant/dashboard`;

    const html = `
      <div style="font-family: 'Rajdhani', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background-color: #0a0d14; padding: 24px 25px 16px; text-align: center;">
          <img src="${logoUrl}" alt="FGN" width="120" style="margin: 0 auto;" />
        </div>
        <h1 style="font-size: 22px; font-weight: bold; font-family: 'Orbitron', 'Rajdhani', Arial, sans-serif; color: #0a0d14; margin: 24px 25px 16px;">
          Welcome to ${tenantName} — You're In!
        </h1>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 25px 20px;">
          Your account has been verified and you've been added as
          <strong>${roleLabel}</strong> of <strong>${tenantName}</strong> on
          <a href="${siteUrl}" style="color: #00b8b8; text-decoration: underline;"><strong>FGN — Fibre Gaming Network</strong></a>.
        </p>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 25px 20px;">
          You're all set! Head to your dashboard to get started.
        </p>
        <a href="${dashboardUrl}" style="display: block; background-color: #00e6e6; color: #0a0d14; font-size: 15px; font-weight: bold; font-family: 'Orbitron', 'Rajdhani', Arial, sans-serif; border-radius: 8px; padding: 14px 28px; text-decoration: none; text-align: center; margin: 8px 25px 28px;">
          Go to Dashboard
        </a>
        <p style="font-size: 12px; color: #999; margin: 0 25px 24px;">
          If you didn't expect this, you can safely ignore this email.
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
        subject: `Welcome to ${tenantName} — You're In!`,
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

    console.log("Welcome email sent to", email, result);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send invite welcome error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
