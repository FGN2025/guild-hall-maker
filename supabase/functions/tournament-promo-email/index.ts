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
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find open tournaments starting within 3 days
    const { data: tournaments, error: tErr } = await supabase
      .from("tournaments")
      .select("id, name, start_date, game, created_by")
      .eq("status", "open")
      .gte("start_date", now.toISOString())
      .lte("start_date", in3Days.toISOString());

    if (tErr) throw tErr;
    if (!tournaments || tournaments.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;

    for (const t of tournaments) {
      // Get registered user IDs
      const { data: regs } = await supabase
        .from("tournament_registrations")
        .select("user_id")
        .eq("tournament_id", t.id)
        .eq("status", "registered");

      const registeredIds = new Set((regs || []).map((r: any) => r.user_id));

      // Determine the tournament's owning tenant from its creator.
      // Creator with no tenant => platform-wide tournament => all users.
      let tenantId: string | null = null;
      if (t.created_by) {
        const { data: ownerTenant } = await supabase.rpc("get_user_tenant", { _user_id: t.created_by });
        tenantId = (ownerTenant as string | null) ?? null;
      }

      // Build the audience
      let profiles: { user_id: string; display_name: string | null }[] | null = null;

      if (tenantId) {
        const [{ data: admins }, { data: subs }] = await Promise.all([
          supabase.from("tenant_admins").select("user_id").eq("tenant_id", tenantId),
          supabase.from("tenant_subscribers").select("user_id").eq("tenant_id", tenantId).not("user_id", "is", null),
        ]);
        const memberIds = Array.from(new Set([
          ...(admins || []).map((r: any) => r.user_id),
          ...(subs || []).map((r: any) => r.user_id),
        ].filter(Boolean)));

        if (memberIds.length === 0) {
          console.log(`Tournament ${t.id} scoped to tenant ${tenantId} with no members; skipping`);
          continue;
        }

        const { data } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", memberIds);
        profiles = data as any;
      } else {
        const { data } = await supabase.from("profiles").select("user_id, display_name");
        profiles = data as any;
      }

      if (!profiles) continue;

      for (const p of profiles) {
        if (registeredIds.has(p.user_id)) continue;

        // Dedup check
        const { data: existing } = await supabase
          .from("engagement_email_log")
          .select("id")
          .eq("user_id", p.user_id)
          .eq("email_type", "tournament_promo")
          .eq("reference_id", t.id)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Preference check
        const { data: pref } = await supabase
          .from("notification_preferences")
          .select("email_enabled")
          .eq("user_id", p.user_id)
          .eq("notification_type", "tournament_promo")
          .single();

        if (pref?.email_enabled === false) continue;

        // Get email
        const { data: userData } = await supabase.auth.admin.getUserById(p.user_id);
        const email = userData?.user?.email;
        if (!email) continue;

        // Skip suppressed addresses (bounces, complaints, unsubscribes)
        const { data: suppressed } = await supabase
          .from("suppressed_emails")
          .select("email")
          .eq("email", email.toLowerCase())
          .limit(1);
        if (suppressed && suppressed.length > 0) continue;

        const hoursUntil = Math.round((new Date(t.start_date).getTime() - now.getTime()) / (60 * 60 * 1000));
        const daysUntil = Math.ceil(hoursUntil / 24);
        const displayName = p.display_name || "Player";

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "FGN <noreply@play.fgn.gg>",
            to: [email],
            subject: `Don't miss out! "${t.name}" starts in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#e5e7eb;padding:32px;border-radius:12px;">
                <h1 style="color:#a855f7;font-size:24px;margin-bottom:8px;">🏆 Tournament Alert</h1>
                <p style="color:#9ca3af;margin-bottom:16px;">Hey ${displayName},</p>
                <p style="color:#d1d5db;margin-bottom:24px;">
                  <strong style="color:#a855f7;">"${t.name}"</strong> starts in <strong>${daysUntil} day${daysUntil !== 1 ? "s" : ""}</strong> and registration is still open.
                  Don't miss your chance to compete!
                </p>
                <div style="text-align:center;margin-bottom:24px;">
                  <a href="https://play.fgn.gg/tournaments/${t.id}" style="display:inline-block;background:#a855f7;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Register Now</a>
                </div>
                <p style="color:#6b7280;font-size:12px;text-align:center;">You're receiving this because you have tournament promotion emails enabled. Manage preferences in your profile settings.</p>
              </div>
            `,
          }),
        });

        if (res.ok) {
          await supabase.from("engagement_email_log").insert({
            user_id: p.user_id,
            email_type: "tournament_promo",
            reference_id: t.id,
          });
          sent++;
        } else {
          console.error(`Failed to send promo to ${email}:`, await res.text());
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tournament-promo-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
