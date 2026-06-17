import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  thumbnail?: { url: string };
  image?: { url: string };
  timestamp?: string;
}

interface SendBody {
  purpose: string;
  tenant_id?: string | null;
  content?: string;
  embeds?: Embed[];
  username?: string;
  avatar_url?: string;
  // Optional template inputs the function can format itself
  template?: "tournament_published" | "tournament_completed" | "tenant_event_published";
  data?: Record<string, any>;
}

const COLOR = {
  cyan: 0x22d3ee,
  violet: 0x8b5cf6,
  amber: 0xf59e0b,
  azure: 0x3b82f6,
};

function buildFromTemplate(b: SendBody): { content?: string; embeds: Embed[] } | null {
  const d = b.data ?? {};
  const base = (color: number, title: string, desc?: string): Embed => ({
    title,
    description: desc,
    color,
    footer: { text: "FGN — fgn.gg" },
    timestamp: new Date().toISOString(),
  });

  switch (b.template) {
    case "tournament_published": {
      const e = base(
        COLOR.cyan,
        `🏆 New Tournament: ${d.name ?? "Tournament"}`,
        d.description ?? undefined,
      );
      const fields: Embed["fields"] = [];
      if (d.game) fields.push({ name: "Game", value: String(d.game), inline: true });
      if (d.format) fields.push({ name: "Format", value: String(d.format), inline: true });
      if (d.start_date)
        fields.push({
          name: "Starts",
          value: `<t:${Math.floor(new Date(d.start_date).getTime() / 1000)}:F>`,
          inline: false,
        });
      if (d.url) fields.push({ name: "Register", value: d.url });
      e.fields = fields;
      if (d.image_url) e.image = { url: d.image_url };
      return { embeds: [e] };
    }
    case "tournament_completed": {
      const e = base(
        COLOR.amber,
        `🥇 ${d.name ?? "Tournament"} — Results`,
        "Congratulations to our champions!",
      );
      e.fields = [
        d.first_name && { name: "🥇 1st", value: String(d.first_name), inline: true },
        d.second_name && { name: "🥈 2nd", value: String(d.second_name), inline: true },
        d.third_name && { name: "🥉 3rd", value: String(d.third_name), inline: true },
      ].filter(Boolean) as Embed["fields"];
      return { embeds: [e] };
    }
    case "tenant_event_published": {
      const e = base(
        COLOR.violet,
        `📅 ${d.name ?? "Event"}`,
        d.description ?? undefined,
      );
      const fields: Embed["fields"] = [];
      if (d.start_date)
        fields.push({
          name: "When",
          value: `<t:${Math.floor(new Date(d.start_date).getTime() / 1000)}:F>`,
        });
      if (d.url) fields.push({ name: "Details", value: d.url });
      e.fields = fields;
      if (d.image_url) e.image = { url: d.image_url };
      return { embeds: [e] };
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: SendBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.purpose) return json({ error: "purpose required" }, 400);

  // Lookup webhook(s): tenant-specific first, else global (tenant_id IS NULL)
  let query = admin
    .from("discord_channel_webhooks")
    .select("id, webhook_url, tenant_id")
    .eq("purpose", body.purpose)
    .eq("is_active", true);

  if (body.tenant_id) {
    query = query.or(`tenant_id.eq.${body.tenant_id},tenant_id.is.null`);
  } else {
    query = query.is("tenant_id", null);
  }

  const { data: hooks, error: hookErr } = await query;
  if (hookErr) return json({ error: hookErr.message }, 500);
  if (!hooks || hooks.length === 0) {
    return json({ ok: true, dispatched: 0, message: "no webhook configured" });
  }

  // Build payload
  let payload: { content?: string; embeds?: Embed[]; username?: string; avatar_url?: string };
  const fromTpl = buildFromTemplate(body);
  if (fromTpl) {
    payload = { ...fromTpl, username: body.username, avatar_url: body.avatar_url };
  } else {
    payload = {
      content: body.content,
      embeds: body.embeds,
      username: body.username,
      avatar_url: body.avatar_url,
    };
  }

  const results: any[] = [];
  for (const hook of hooks) {
    let status: "success" | "failed" = "success";
    let errorMsg: string | null = null;
    let httpStatus = 0;
    try {
      const resp = await fetch(hook.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      httpStatus = resp.status;
      if (!resp.ok) {
        status = "failed";
        errorMsg = `HTTP ${resp.status}: ${(await resp.text()).slice(0, 500)}`;
      }
    } catch (e) {
      status = "failed";
      errorMsg = (e as Error).message;
    }
    await admin.from("discord_send_log").insert({
      webhook_id: hook.id,
      tenant_id: hook.tenant_id,
      purpose: body.purpose,
      status,
      http_status: httpStatus,
      error_message: errorMsg,
      payload_preview: JSON.stringify(payload).slice(0, 1000),
    });
    results.push({ webhook_id: hook.id, status, http_status: httpStatus, error: errorMsg });
  }

  return json({ ok: true, dispatched: results.length, results });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
