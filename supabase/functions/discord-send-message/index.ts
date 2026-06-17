import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmbed, type DiscordPayload, type TemplateName } from "../_shared/discordEmbeds.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendBody {
  purpose: string;
  tenant_id?: string | null;
  content?: string;
  embeds?: any[];
  username?: string;
  avatar_url?: string;
  template?: TemplateName;
  data?: Record<string, any>;
}

const DISCORD_API = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
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

  // Build payload (from template or passthrough)
  let payload: DiscordPayload;
  if (body.template) {
    payload = buildEmbed(body.template, body.data ?? {});
  } else {
    payload = { content: body.content, embeds: body.embeds };
  }
  if (body.username) payload.username = body.username;
  if (body.avatar_url) payload.avatar_url = body.avatar_url;

  const results: any[] = [];

  // --- Webhooks ---
  let webhookQuery = admin
    .from("discord_channel_webhooks")
    .select("id, webhook_url, tenant_id")
    .eq("purpose", body.purpose)
    .eq("is_active", true);
  webhookQuery = body.tenant_id
    ? webhookQuery.or(`tenant_id.eq.${body.tenant_id},tenant_id.is.null`)
    : webhookQuery.is("tenant_id", null);
  const { data: hooks } = await webhookQuery;

  for (const hook of hooks ?? []) {
    const r = await deliverWebhook(hook.webhook_url, payload);
    await admin.from("discord_send_log").insert({
      webhook_id: hook.id,
      tenant_id: hook.tenant_id,
      purpose: body.purpose,
      transport: "webhook",
      status: r.ok ? "success" : "failed",
      http_status: r.status,
      error_message: r.error,
      payload_preview: JSON.stringify(payload).slice(0, 1000),
    });
    results.push({ transport: "webhook", webhook_id: hook.id, ...r });
  }

  // --- Bot channel routes ---
  if (botToken) {
    let routeQuery = admin
      .from("discord_channel_routes")
      .select("id, channel_id, tenant_id")
      .eq("purpose", body.purpose)
      .eq("is_active", true);
    routeQuery = body.tenant_id
      ? routeQuery.or(`tenant_id.eq.${body.tenant_id},tenant_id.is.null`)
      : routeQuery.is("tenant_id", null);
    const { data: routes } = await routeQuery;

    for (const route of routes ?? []) {
      const r = await deliverBot(botToken, route.channel_id, payload);
      await admin.from("discord_send_log").insert({
        route_id: route.id,
        tenant_id: route.tenant_id,
        purpose: body.purpose,
        transport: "bot",
        status: r.ok ? "success" : "failed",
        http_status: r.status,
        error_message: r.error,
        payload_preview: JSON.stringify(payload).slice(0, 1000),
      });
      results.push({ transport: "bot", route_id: route.id, channel_id: route.channel_id, ...r });
    }
  }

  if (results.length === 0) {
    return json({ ok: true, dispatched: 0, message: "no webhook or route configured" });
  }
  return json({ ok: true, dispatched: results.length, results });
});

async function deliverWebhook(url: string, payload: DiscordPayload) {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const txt = (await resp.text()).slice(0, 500);
      return { ok: false, status: resp.status, error: `HTTP ${resp.status}: ${txt}` };
    }
    await resp.text().catch(() => "");
    return { ok: true, status: resp.status, error: null as string | null };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

async function deliverBot(token: string, channelId: string, payload: DiscordPayload) {
  try {
    const resp = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify({
        content: payload.content,
        embeds: payload.embeds,
      }),
    });
    if (!resp.ok) {
      const txt = (await resp.text()).slice(0, 500);
      return { ok: false, status: resp.status, error: `HTTP ${resp.status}: ${txt}` };
    }
    await resp.text().catch(() => "");
    return { ok: true, status: resp.status, error: null as string | null };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
