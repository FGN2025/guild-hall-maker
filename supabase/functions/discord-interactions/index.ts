// Discord Interactions endpoint (slash commands).
// Set DISCORD_PUBLIC_KEY secret. Configure this function URL in the Discord
// Developer Portal → General Information → Interactions Endpoint URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY") ?? "";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function verify(req: Request, body: string): boolean {
  const sig = req.headers.get("X-Signature-Ed25519");
  const ts = req.headers.get("X-Signature-Timestamp");
  if (!sig || !ts || !PUBLIC_KEY) return false;
  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(ts + body),
      hexToBytes(sig),
      hexToBytes(PUBLIC_KEY),
    );
  } catch { return false; }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function reply(content: string, ephemeral = false) {
  return new Response(JSON.stringify({
    type: 4,
    data: { content, flags: ephemeral ? 64 : 0 },
  }), { headers: { "Content-Type": "application/json" } });
}

async function handleLeaderboard() {
  const { data } = await admin
    .from("season_scores")
    .select("points, user_id, profiles!inner(display_name)")
    .order("points", { ascending: false })
    .limit(10);
  if (!data?.length) return reply("No leaderboard data yet.");
  const lines = data.map((r: any, i: number) =>
    `**${i + 1}.** ${r.profiles?.display_name ?? "Player"} — ${r.points} pts`);
  return reply(`🏆 **FGN Leaderboard**\n${lines.join("\n")}\nhttps://fgn.gg/leaderboard`);
}

async function handleTournaments() {
  const { data } = await admin
    .from("tournaments")
    .select("id, name, game, start_date, status")
    .in("status", ["open", "upcoming", "in_progress"])
    .order("start_date", { ascending: true })
    .limit(5);
  if (!data?.length) return reply("No active tournaments right now.");
  const lines = data.map((t: any) =>
    `• **${t.name}** (${t.game}) — ${new Date(t.start_date).toLocaleDateString()} — https://fgn.gg/tournaments/${t.id}`);
  return reply(`🎮 **Active Tournaments**\n${lines.join("\n")}`);
}

async function handleChallenges() {
  const { data } = await admin
    .from("challenges")
    .select("id, name, points_reward, game")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);
  if (!data?.length) return reply("No active challenges.");
  const lines = data.map((c: any) =>
    `• **${c.name}** (${c.game ?? "—"}) — ${c.points_reward} pts — https://fgn.gg/challenges/${c.id}`);
  return reply(`⚔️ **Active Challenges**\n${lines.join("\n")}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text();
  if (!verify(req, raw)) {
    return new Response("invalid request signature", { status: 401 });
  }
  const body = JSON.parse(raw);

  // PING
  if (body.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // APPLICATION_COMMAND
  if (body.type === 2) {
    const name = body.data?.name as string;
    try {
      if (name === "leaderboard") return await handleLeaderboard();
      if (name === "tournaments") return await handleTournaments();
      if (name === "challenges") return await handleChallenges();
      return reply(`Unknown command: ${name}`, true);
    } catch (e) {
      return reply(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
    }
  }

  return new Response(JSON.stringify({ type: 4, data: { content: "Unsupported interaction" } }), {
    headers: { "Content-Type": "application/json" },
  });
});
