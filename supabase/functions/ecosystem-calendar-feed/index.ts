import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ecosystem-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toICalDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcal(text: string): string {
  return (text || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";

    // Fetch tournaments and tenant events in parallel
    const [tournamentsRes, tenantEventsRes, challengesRes] = await Promise.all([
      adminClient
        .from("tournaments")
        .select("id, name, game_id, status, start_date, end_date, max_participants, prize_pool")
        .in("status", ["published", "in_progress"])
        .order("start_date", { ascending: true })
        .limit(200),
      adminClient
        .from("tenant_events")
        .select("id, tenant_id, name, game, description, start_date, end_date, status, image_url, max_participants")
        .eq("is_public", true)
        .eq("status", "published")
        .order("start_date", { ascending: true })
        .limit(200),
      adminClient
        .from("challenges")
        .select("id, name, description, end_date, difficulty, points_reward")
        .eq("is_active", true)
        .not("end_date", "is", null)
        .order("end_date", { ascending: true })
        .limit(100),
    ]);

    if (format === "ical") {
      let ical = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FGN Play//Ecosystem Calendar//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";

      for (const t of tournamentsRes.data || []) {
        ical += `BEGIN:VEVENT\r\nUID:tournament-${t.id}@play.fgn.gg\r\nDTSTART:${toICalDate(t.start_date)}\r\n`;
        if (t.end_date) ical += `DTEND:${toICalDate(t.end_date)}\r\n`;
        ical += `SUMMARY:${escapeIcal(t.name)}\r\nDESCRIPTION:Tournament - ${escapeIcal(t.status)}\r\nCATEGORIES:TOURNAMENT\r\nEND:VEVENT\r\n`;
      }

      for (const e of tenantEventsRes.data || []) {
        ical += `BEGIN:VEVENT\r\nUID:tenant-event-${e.id}@play.fgn.gg\r\nDTSTART:${toICalDate(e.start_date)}\r\n`;
        if (e.end_date) ical += `DTEND:${toICalDate(e.end_date)}\r\n`;
        ical += `SUMMARY:${escapeIcal(e.name)}\r\nDESCRIPTION:${escapeIcal(e.description || "")}\r\nCATEGORIES:TENANT_EVENT\r\nEND:VEVENT\r\n`;
      }

      for (const c of challengesRes.data || []) {
        if (!c.end_date) continue;
        ical += `BEGIN:VEVENT\r\nUID:challenge-${c.id}@play.fgn.gg\r\nDTSTART:${toICalDate(c.end_date)}\r\nSUMMARY:Challenge Deadline: ${escapeIcal(c.name)}\r\nDESCRIPTION:${escapeIcal(c.description || "")} (${c.points_reward} pts)\r\nCATEGORIES:CHALLENGE\r\nEND:VEVENT\r\n`;
      }

      ical += "END:VCALENDAR\r\n";

      return new Response(ical, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": "attachment; filename=fgn-calendar.ics",
        },
      });
    }

    // JSON format
    const events = [
      ...(tournamentsRes.data || []).map((t: any) => ({
        id: t.id,
        type: "tournament",
        title: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        status: t.status,
        max_participants: t.max_participants,
        prize_pool: t.prize_pool,
      })),
      ...(tenantEventsRes.data || []).map((e: any) => ({
        id: e.id,
        type: "tenant_event",
        title: e.name,
        start_date: e.start_date,
        end_date: e.end_date,
        status: e.status,
        description: e.description,
        game: e.game,
        image_url: e.image_url,
        max_participants: e.max_participants,
      })),
      ...(challengesRes.data || []).map((c: any) => ({
        id: c.id,
        type: "challenge_deadline",
        title: `Challenge: ${c.name}`,
        start_date: c.end_date,
        end_date: c.end_date,
        difficulty: c.difficulty,
        points_reward: c.points_reward,
        description: c.description,
      })),
    ].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Calendar feed error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
