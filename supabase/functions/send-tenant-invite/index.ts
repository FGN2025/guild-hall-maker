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

    const { email, tenantName, role, invitedBy } = await req.json();

    if (!email || !tenantName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, tenantName, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const siteUrl = "https://guild-hall-maker.lovable.app";
    const logoUrl = "https://yrhwzmkenjgiujhofucx.supabase.co/storage/v1/object/public/email-assets/fgn-logo.png";

    const html = `
      <div style="font-family: 'Rajdhani', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background-color: #0a0d14; padding: 24px 25px 16px; text-align: center;">
          <img src="${logoUrl}" alt="FGN" width="120" style="margin: 0 auto;" />
        </div>
        <h1 style="font-size: 22px; font-weight: bold; font-family: 'Orbitron', 'Rajdhani', Arial, sans-serif; color: #0a0d14; margin: 24px 25px 16px;">
          You've Been Invited
        </h1>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 25px 20px;">
          You've been invited to join <strong>${tenantName}</strong> on
          <a href="${siteUrl}" style="color: #00b8b8; text-decoration: underline;"><strong>FGN — Fibre Gaming Network</strong></a>
          as a <strong>${roleLabel}</strong>.
        </p>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 25px 20px;">
          Create an account or log in with the email address <strong>${email}</strong> to get started. Your role will be assigned automatically.
        </p>
        <a href="${siteUrl}/auth?invite=true&email=${encodeURIComponent(email)}" style="display: block; background-color: #00e6e6; color: #0a0d14; font-size: 15px; font-weight: bold; font-family: 'Orbitron', 'Rajdhani', Arial, sans-serif; border-radius: 8px; padding: 14px 28px; text-decoration: none; text-align: center; margin: 8px 25px 28px;">
          Sign Up &amp; Join
        </a>
        <p style="font-size: 12px; color: #999; margin: 0 25px 24px;">
          Wasn't expecting this? You can safely ignore this email.
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
        subject: `You've been invited to manage ${tenantName} on FGN`,
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

    console.log("Tenant invite email sent to", email, result);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send tenant invite error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
