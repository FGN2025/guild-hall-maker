// Registers global slash commands with Discord.
// Call once (or after editing the command list) as an admin from the browser.
// Requires DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMANDS = [
  { name: "leaderboard", description: "Show the top 10 FGN players this season" },
  { name: "tournaments", description: "List active/upcoming FGN tournaments" },
  { name: "challenges", description: "List currently active FGN challenges" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = Deno.env.get("DISCORD_BOT_TOKEN");
  const appId = Deno.env.get("DISCORD_APPLICATION_ID");

  // Admin auth
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  if (!token || !appId) return json({ error: "DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID required" }, 400);

  const resp = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bot ${token}` },
    body: JSON.stringify(COMMANDS),
  });
  const body = await resp.text();
  return json({ ok: resp.ok, status: resp.status, body: body.slice(0, 2000) }, resp.ok ? 200 : 500);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
