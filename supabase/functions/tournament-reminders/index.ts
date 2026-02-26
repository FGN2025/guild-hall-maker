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

    // Find tournaments starting in the next 24 hours that are open/upcoming
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: tournaments, error: tErr } = await supabase
      .from("tournaments")
      .select("id, name, start_date")
      .in("status", ["open", "upcoming"])
      .gte("start_date", now.toISOString())
      .lte("start_date", in24h.toISOString());

    if (tErr) throw tErr;
    if (!tournaments || tournaments.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    for (const t of tournaments) {
      // Get registered players
      const { data: regs } = await supabase
        .from("tournament_registrations")
        .select("user_id")
        .eq("tournament_id", t.id)
        .eq("status", "registered");

      if (!regs || regs.length === 0) continue;

      for (const reg of regs) {
        // Check preference
        const { data: pref } = await supabase
          .from("notification_preferences")
          .select("in_app_enabled")
          .eq("user_id", reg.user_id)
          .eq("notification_type", "upcoming_tournament")
          .single();

        const enabled = pref?.in_app_enabled ?? true;
        if (!enabled) continue;

        // Avoid duplicates: check if we already sent this reminder
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", reg.user_id)
          .eq("title", "Tournament Starting Soon")
          .ilike("message", `%${t.name}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const hoursUntil = Math.round((new Date(t.start_date).getTime() - now.getTime()) / (60 * 60 * 1000));

        await supabase.from("notifications").insert({
          user_id: reg.user_id,
          type: "info",
          title: "Tournament Starting Soon",
          message: `"${t.name}" starts in ~${hoursUntil} hour${hoursUntil !== 1 ? "s" : ""}. Get ready!`,
          link: `/tournaments/${t.id}`,
        });
        sent++;
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
