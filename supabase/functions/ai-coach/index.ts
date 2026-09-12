import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotebookConnection {
  api_url: string;
  notebook_id: string;
  name: string;
  game_id: string | null;
}

async function fetchActiveConnections(gameId?: string | null): Promise<NotebookConnection[]> {
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (gameId) {
    const { data: gameConns } = await supa
      .from("admin_notebook_connections")
      .select("api_url, notebook_id, name, game_id")
      .eq("is_active", true)
      .eq("game_id", gameId);

    const { data: globalConns } = await supa
      .from("admin_notebook_connections")
      .select("api_url, notebook_id, name, game_id")
      .eq("is_active", true)
      .is("game_id", null);

    return [
      ...((gameConns ?? []) as NotebookConnection[]),
      ...((globalConns ?? []) as NotebookConnection[]),
    ];
  }

  const { data, error } = await supa
    .from("admin_notebook_connections")
    .select("api_url, notebook_id, name, game_id")
    .eq("is_active", true);
  if (error) {
    console.warn("Failed to fetch notebook connections:", error.message);
    return [];
  }
  return (data ?? []) as NotebookConnection[];
}

async function searchNotebooks(query: string, gameId?: string | null): Promise<string> {
  const connections = await fetchActiveConnections(gameId);
  if (connections.length === 0) return "";

  const NOTEBOOK_PASS = Deno.env.get("OPEN_NOTEBOOK_PASSWORD");
  const allPassages: string[] = [];
  const MAX_TOTAL = 8;
  const MAX_PER_NOTEBOOK = 3;

  // Process sequentially to respect priority ordering (game-specific first)
  if (!NOTEBOOK_PASS) {
    console.warn("OPEN_NOTEBOOK_PASSWORD is not set in this function's environment; notebook lookups will be rejected with 401");
  }

  for (const conn of connections) {
    if (allPassages.length >= MAX_TOTAL) break;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (NOTEBOOK_PASS) headers["Authorization"] = `Bearer ${NOTEBOOK_PASS}`;

      const res = await fetch(`${conn.api_url.replace(/\/$/, "")}/api/search`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, notebook_id: conn.notebook_id }),
      });

      if (!res.ok) {
        // Log the failure body so "Missing authorization header" (credential not
        // reaching the function) is distinguishable from "Invalid password"
        // (credential stale/wrong on the notebook server). Never log the password.
        const body = await res.text().catch(() => "");
        console.warn(
          `Notebook search failed for "${conn.name}": ${res.status}`,
          body.slice(0, 200),
          NOTEBOOK_PASS ? "(auth header sent)" : "(no auth header — OPEN_NOTEBOOK_PASSWORD missing)"
        );
        continue;
      }

      const data = await res.json();
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];

      for (const item of items.slice(0, MAX_PER_NOTEBOOK)) {
        if (allPassages.length >= MAX_TOTAL) break;
        const text = item.content || item.text || item.snippet || JSON.stringify(item);
        if (text) allPassages.push(`[Source: ${conn.name}]: ${text}`);
      }
    } catch (e) {
      console.warn(`Notebook search error for "${conn.name}":`, e);
    }
  }

  if (allPassages.length === 0) return "";
  return "\n\n## Relevant Knowledge Base Content:\n" + allPassages.join("\n\n");
}

async function fetchPlayerProfile(userId: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile } = await supabase
    .from("coach_player_profiles")
    .select("enabled, notes, stats_summary")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || !profile.enabled) return "";

  const sections: string[] = [];
  if (profile.notes) sections.push(`**Player Notes:** ${profile.notes}`);
  if (profile.stats_summary) sections.push(`**Player Stats:** ${profile.stats_summary}`);

  // Fetch any extracted text from uploaded files
  const { data: files } = await supabase
    .from("coach_player_files")
    .select("file_name, extracted_text, game_name")
    .eq("user_id", userId)
    .not("extracted_text", "is", null);

  if (files && files.length > 0) {
    for (const f of files) {
      const gameTag = f.game_name ? ` [${f.game_name}]` : "";
      sections.push(`**Uploaded Data (${f.file_name}${gameTag}):** ${f.extracted_text}`);
    }
  }

  if (sections.length === 0) return "";
  return "\n\n## Player Profile (self-reported by the player — reference naturally, don't repeat verbatim):\n" + sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// Live game research (Steam) — replaces Open Notebook as the primary source of
// game knowledge. Every call is time-boxed and degrades silently.
// ---------------------------------------------------------------------------

type ResearchCacheEntry = { text: string; expires: number };
const researchCache = new Map<string, ResearchCacheEntry>();
const RESEARCH_TTL_MS = 30 * 60 * 1000;

async function fetchJson(url: string, timeoutMs = 6000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface SteamResearch {
  text: string;
  achievements: { api_name: string; display_name: string; description: string | null }[];
  globalPct: Record<string, number>;
}

async function fetchGameResearch(game: any): Promise<SteamResearch> {
  const empty: SteamResearch = { text: "", achievements: [], globalPct: {} };
  const appId = game?.steam_app_id ? String(game.steam_app_id).trim() : "";
  if (!appId) return empty;

  const cacheKey = `research:${appId}`;
  const cached = researchCache.get(cacheKey);

  const key = Deno.env.get("STEAM_API_KEY");
  const [details, schema, globals, news] = await Promise.all([
    fetchJson(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=en`),
    key
      ? fetchJson(
          `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${key}&appid=${appId}`
        )
      : Promise.resolve(null),
    fetchJson(
      `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}&format=json`
    ),
    fetchJson(
      `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=3&maxlength=400&format=json`
    ),
  ]);

  const achievements = ((schema?.game?.availableGameStats?.achievements ?? []) as any[]).map(
    (a: any) => ({
      api_name: a.name as string,
      display_name: (a.displayName as string) || (a.name as string),
      description: (a.description as string) || null,
    })
  );

  const globalPct: Record<string, number> = {};
  for (const g of globals?.achievementpercentages?.achievements ?? []) {
    if (g?.name) globalPct[g.name] = Number(g.percent) || 0;
  }

  const parts: string[] = [];
  const d = details?.[appId]?.success ? details[appId].data : null;
  if (d) {
    const genres = (d.genres ?? []).map((g: any) => g.description).join(", ");
    const cats = (d.categories ?? []).map((c: any) => c.description).slice(0, 8).join(", ");
    parts.push(
      `**${d.name}** (Steam app ${appId})` +
        (genres ? `\nGenres: ${genres}` : "") +
        (cats ? `\nModes/Features: ${cats}` : "") +
        (d.short_description ? `\nAbout: ${stripHtml(d.short_description)}` : "") +
        (d.release_date?.date ? `\nReleased: ${d.release_date.date}` : "")
    );
  }

  if (achievements.length > 0) {
    const ranked = achievements
      .map((a) => ({ ...a, pct: globalPct[a.api_name] ?? null }))
      .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
    const rarest = ranked
      .slice(0, 10)
      .map(
        (a) =>
          `- ${a.display_name}${a.pct !== null ? ` (${a.pct.toFixed(1)}% of players)` : ""}${
            a.description ? ` — ${a.description}` : ""
          }`
      )
      .join("\n");
    parts.push(
      `Achievements in this game: ${achievements.length} total. Rarest / hardest:\n${rarest}`
    );
  }

  const items = ((news?.appnews?.newsitems ?? []) as any[]).slice(0, 3);
  if (items.length > 0) {
    parts.push(
      "Recent official updates/news:\n" +
        items
          .map(
            (n: any) =>
              `- ${n.title} (${new Date((n.date ?? 0) * 1000).toISOString().slice(0, 10)}): ${stripHtml(
                String(n.contents ?? "")
              ).slice(0, 240)}`
          )
          .join("\n")
    );
  }

  if (parts.length === 0) {
    if (cached && cached.expires > Date.now()) {
      return { text: cached.text, achievements, globalPct };
    }
    return { ...empty, achievements, globalPct };
  }

  const text = "\n\n## Live Game Data (from Steam, current):\n" + parts.join("\n\n");
  researchCache.set(cacheKey, { text, expires: Date.now() + RESEARCH_TTL_MS });
  return { text, achievements, globalPct };
}

// ---------------------------------------------------------------------------
// This player's actual record on the platform (read-only)
// ---------------------------------------------------------------------------

async function fetchPlayerGameplay(
  userId: string,
  game: any,
  research: SteamResearch
): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const appId = game?.steam_app_id ? String(game.steam_app_id).trim() : null;
  const gameId = game?.id ?? null;
  const sections: string[] = [];

  const [playtime, steamAch, matches, challengeRows, questRows, season] = await Promise.all([
    appId
      ? supabase
          .from("steam_player_playtime")
          .select("minutes_played, synced_at")
          .eq("user_id", userId)
          .eq("steam_app_id", appId)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    appId
      ? supabase
          .from("steam_player_achievements")
          .select("achievement_api_name, achieved, unlock_time")
          .eq("user_id", userId)
          .eq("steam_app_id", appId)
      : Promise.resolve({ data: [] } as any),
    supabase
      .from("match_results")
      .select("player1_id, player2_id, player1_score, player2_score, winner_id, completed_at, status")
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("challenge_completions")
      .select("awarded_points, completed_at, challenges(name, game_id, difficulty, skill_tags)")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(25),
    supabase
      .from("quest_completions")
      .select("awarded_points, completed_at, quests(name, game_id, difficulty)")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(25),
    supabase
      .from("season_scores")
      .select("points, wins, losses, tournaments_played, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  if (playtime?.data?.minutes_played != null) {
    const hrs = Math.round((playtime.data.minutes_played / 60) * 10) / 10;
    sections.push(`**Hours played (${game?.name ?? "this game"}):** ${hrs}h on Steam`);
  }

  const owned = (steamAch?.data ?? []) as { achievement_api_name: string; achieved: boolean }[];
  if (owned.length > 0) {
    const earned = new Set(owned.filter((a) => a.achieved).map((a) => a.achievement_api_name));
    const total = research.achievements.length || owned.length;
    const pct = total > 0 ? Math.round((earned.size / total) * 100) : 0;
    sections.push(`**Achievements:** ${earned.size} of ${total} unlocked (${pct}%)`);

    const missing = research.achievements
      .filter((a) => !earned.has(a.api_name))
      .map((a) => ({ ...a, pct: research.globalPct[a.api_name] ?? null }))
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
      .slice(0, 8);
    if (missing.length > 0) {
      sections.push(
        "**Closest achievements still missing (most players already have these):**\n" +
          missing
            .map(
              (a) =>
                `- ${a.display_name}${a.pct !== null ? ` (${a.pct.toFixed(1)}% of players)` : ""}${
                  a.description ? ` — ${a.description}` : ""
                }`
            )
            .join("\n")
      );
    }
  }

  const m = (matches?.data ?? []) as any[];
  if (m.length > 0) {
    const wins = m.filter((r) => r.winner_id === userId).length;
    const recent = m
      .slice(0, 5)
      .map((r) => {
        const isP1 = r.player1_id === userId;
        const mine = isP1 ? r.player1_score : r.player2_score;
        const theirs = isP1 ? r.player2_score : r.player1_score;
        const res = r.winner_id === userId ? "W" : r.winner_id ? "L" : "-";
        return `${res} ${mine ?? "?"}-${theirs ?? "?"}`;
      })
      .join(", ");
    sections.push(
      `**Recent matches:** ${wins}W-${m.length - wins}L over last ${m.length} completed (most recent first: ${recent})`
    );
  }

  const chall = ((challengeRows?.data ?? []) as any[]).filter(
    (c) => !gameId || c.challenges?.game_id === gameId
  );
  if (chall.length > 0) {
    const names = chall.slice(0, 6).map((c) => c.challenges?.name).filter(Boolean).join("; ");
    const pts = chall.reduce((s, c) => s + (c.awarded_points ?? 0), 0);
    sections.push(`**Challenges completed:** ${chall.length} (${pts} pts). Recent: ${names}`);
    const tags = [
      ...new Set(chall.flatMap((c) => (c.challenges?.skill_tags ?? []) as string[])),
    ].slice(0, 10);
    if (tags.length > 0) sections.push(`**Demonstrated skills:** ${tags.join(", ")}`);
  }

  const qs = ((questRows?.data ?? []) as any[]).filter(
    (q) => !gameId || q.quests?.game_id === gameId
  );
  if (qs.length > 0) {
    const names = qs.slice(0, 6).map((q) => q.quests?.name).filter(Boolean).join("; ");
    sections.push(`**Quests completed:** ${qs.length}. Recent: ${names}`);
  }

  const s = ((season?.data ?? []) as any[])[0];
  if (s) {
    sections.push(
      `**Current season:** ${s.points ?? 0} pts, ${s.wins ?? 0}W-${s.losses ?? 0}L across ${
        s.tournaments_played ?? 0
      } tournaments`
    );
  }

  if (sections.length === 0) {
    return "\n\n## This Player's Record:\nNo recorded gameplay for this player yet (no Steam link, matches, challenges or quests). Say so plainly if they ask for an assessment of their own play, and offer to guide them through linking Steam or entering a challenge.";
  }

  return (
    "\n\n## This Player's Record (actual platform + Steam data — ground any assessment in these numbers):\n" +
    sections.join("\n\n")
  );
}

// Category-specific coaching frameworks
const categoryCoaching: Record<string, string> = {
  "Shooter": `### Shooter Coaching Framework
- **Aim Training**: Crosshair placement at head height, pre-aiming common angles, tracking vs flicking practice routines
- **Movement**: Counter-strafing, jiggle-peeking, bunny-hopping, slide-canceling (game-dependent)
- **Game Sense**: Map control, spawn awareness, economy management, utility usage timing
- **Positioning**: Off-angles, trading positions, site anchoring, rotation timing
- **Team Play**: Callouts, trading kills, execute coordination, default setups vs rushes
- **Mental Game**: Dealing with tilt after losing rounds, warm-up routines, VOD review habits`,

  "MOBA": `### MOBA Coaching Framework
- **Laning Phase**: Last-hitting/CS optimization, trading patterns, wave manipulation (freezing, slow push, fast push)
- **Map Awareness**: Ward placement, jungle tracking, roam timings, objective control windows
- **Champion/Hero Mastery**: Power spikes, combo execution, matchup knowledge, itemization paths
- **Macro Strategy**: Split pushing, objective sequencing (drake/baron/roshan priority), team fight positioning
- **Draft & Composition**: Counter-picking, team comp synergy (poke, dive, protect-the-carry, split)
- **Mental Game**: Avoiding blame, adapting to losing lanes, shotcalling basics`,

  "Fighting": `### Fighting Game Coaching Framework
- **Fundamentals**: Spacing/footsies, whiff punishing, anti-airs, throw teching
- **Combo Execution**: Bread-and-butter combos, hit-confirming, optimal damage routes, combo scaling
- **Neutral Game**: Poke ranges, movement options, controlling space, conditioning opponents
- **Defense**: Blocking mixups (high/low/left/right), wake-up options, burst/escape mechanics
- **Frame Data**: Understanding plus/minus on block, punishable moves, frame traps, tick throws
- **Matchup Knowledge**: Character-specific counterplay, problematic moves to watch for, adaptation strategies`,

  "Sports": `### Sports Game Coaching Framework
- **Offense**: Play calling/formation selection, reading defenses, timing mechanics, skill moves
- **Defense**: Coverage schemes, user-controlled defense, AI adjustments, pressure tactics
- **Player Management**: Lineup optimization, stamina management, substitution timing, build strategies
- **Game Management**: Clock management, momentum shifts, adaptive strategy mid-game
- **Online Play**: Dealing with lag compensation, meta formations, cheese play counters
- **Career/Franchise**: Draft strategies, cap management, player development paths`,

  "MMORPG": `### MMORPG Coaching Framework
- **Character Building**: Stat allocation, talent/skill trees, gear optimization, BiS (Best in Slot) planning
- **PvE Content**: Dungeon mechanics, raid positioning, DPS rotations, healing priorities, tank cooldown management
- **PvP**: Arena composition, battleground strategy, open-world PvP tactics, crowd control chains
- **Economy**: Auction house strategies, crafting profitability, farming routes, gold-making methods
- **Progression**: Efficient leveling paths, daily/weekly priority lists, reputation grinds, catch-up mechanics
- **Social**: Guild management, group-finding tips, raid leading, communication in voice chat`,

  "RPG": `### RPG Coaching Framework
- **Character Builds**: Stat allocation, skill synergies, class/subclass optimization
- **Combat Strategy**: Elemental weaknesses, party composition, boss phase recognition, resource management
- **Exploration**: Efficient area clearing, secret/hidden content locations, quest ordering
- **Gear & Items**: Equipment upgrade priorities, crafting systems, consumable usage timing
- **Story/Progression**: Efficient leveling, side quest value assessment, difficulty scaling tips`,

  "Racing": `### Racing Coaching Framework
- **Driving Technique**: Racing lines, braking points, trail braking, throttle control, cornering speed
- **Car Setup**: Suspension tuning, gear ratios, tire compounds, aero balance, differential settings
- **Race Strategy**: Tire management, fuel strategy, pit stop timing, weather adaptation
- **Track Knowledge**: Turn-by-turn breakdowns, reference points, elevation changes, surface types
- **Racecraft**: Overtaking windows, defensive driving, slipstream usage, clean racing etiquette
- **Online Racing**: SR/DR rating improvement, qualifying laps, race-start positioning`,

  "Simulation": `### Simulation Coaching Framework
- **Core Mechanics**: Economy management, resource chains, production optimization, efficiency metrics
- **Progression**: Unlock order priorities, milestone planning, technology/research trees
- **Advanced Strategies**: Min-maxing outputs, automation setups, supply chain optimization
- **Real-World Knowledge**: How real-world parallels apply (farming seasons, construction physics, truck routes)
- **Mods & Customization**: Popular quality-of-life mods, map recommendations, community resources`,

  "Strategy": `### Strategy Coaching Framework
- **Build Orders**: Opening sequences, economic vs military balance, timing attacks
- **Macro Management**: Resource gathering, expansion timing, production cycles, supply management
- **Micro Management**: Unit control, ability usage, kiting, focus-firing priorities
- **Scouting**: Information gathering, reading opponent builds, adapting strategies
- **Map Control**: Key positions, chokepoints, vision control, flanking routes`,

  "Card Game": `### Card Game Coaching Framework
- **Deck Building**: Mana/cost curves, win conditions, synergy identification, tech choices vs meta
- **Mulligan Strategy**: Keep/toss decisions based on matchup and role (aggro/control/combo)
- **Resource Management**: Mana efficiency, card advantage, tempo vs value trades
- **Game Reading**: Tracking opponent's played/unplayed cards, predicting their hand, playing around answers
- **Meta Knowledge**: Tier lists, popular archetypes, counter-deck selection, sideboard strategies
- **Advanced Play**: Lethal calculation, order of operations, bluffing, information denial`,

  "Party": `### Party Game Coaching Framework
- **Core Skills**: Minigame pattern recognition, timing mechanics, adapting to random events
- **Strategy**: Risk assessment, resource/item management, board positioning
- **Multiplayer Tactics**: Reading opponents, alliance management, when to play aggressive vs safe
- **Consistency**: Building reliable execution across varied minigame types`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth guard ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { messages, game } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Extract latest user question for notebook search
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const query = lastUserMsg?.content || "";

    // Build search query with game context
    const searchQuery = game ? `${game.name}: ${query}` : query;

    // Fetch notebook context and player profile in parallel
    const [notebookContext, playerProfileContext] = await Promise.all([
      searchQuery ? searchNotebooks(searchQuery, game?.id || null) : Promise.resolve(""),
      fetchPlayerProfile(userId),
    ]);

    // Build game-specific context from local guide content
    let gameContext = "";
    if (game) {
      gameContext = `\n\n## Active Game Focus: ${game.name}`;
      if (game.category) gameContext += ` (${game.category})`;
      if (game.description) gameContext += `\nGame Description: ${game.description}`;
      if (game.guide_content) gameContext += `\n\n## Local Game Guide:\n${game.guide_content}`;

      // Inject category-specific coaching tips
      const coaching = categoryCoaching[game.category];
      if (coaching) gameContext += `\n\n${coaching}`;
    }

    const systemPrompt = `You are the FGN Esports Coach — a knowledgeable, encouraging, and strategic gaming coach for the FGN (Fiber Gaming Network) community. You specialize in esports coaching, game strategy, mechanical skills, and competitive improvement.
${game ? `\nYou are currently coaching the user specifically on **${game.name}**. Focus your answers on this game. Use game-specific terminology, strategies, and mechanics relevant to ${game.name}.` : "\nYou are providing general esports coaching across all games."}

When answering questions:
- Draw from the knowledge base content and game guide provided below when relevant
- If no knowledge base content matches, use your general esports expertise
- Be specific and actionable in your advice — include drills, practice routines, and measurable goals when appropriate
- Use gaming terminology naturally and explain jargon when it may be unfamiliar
- Encourage improvement and competitive growth with a positive, coach-like tone
- Proactively suggest related areas the player might want to improve
- When discussing strategy, consider multiple skill levels (beginner, intermediate, advanced)
- Format responses with clear headers and bullet points when helpful
- For game-specific questions, reference current meta, patch notes concepts, and community-accepted best practices
- If a player profile is provided, tailor advice to their specific situation, rank, goals, and play style — but don't parrot their stats back to them
${gameContext}${playerProfileContext}${notebookContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
