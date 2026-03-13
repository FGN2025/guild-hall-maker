import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, description, game_name, difficulty, challenge_type, field, draft, game_id, tasks } = await req.json();

    if (!name) return json({ error: "Quest name is required" }, 400);
    if (!field || !["intro", "outro"].includes(field)) return json({ error: "field must be 'intro' or 'outro'" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // --- RAG: search game-specific notebooks ---
    let ragContext = "";
    if (game_id) {
      try {
        const NOTEBOOK_URL = Deno.env.get("OPEN_NOTEBOOK_URL");
        const NOTEBOOK_PASS = Deno.env.get("OPEN_NOTEBOOK_PASSWORD");

        if (NOTEBOOK_URL) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const sb = createClient(supabaseUrl, serviceKey);

          const { data: connections } = await sb
            .from("admin_notebook_connections")
            .select("api_url, notebook_id")
            .eq("game_id", game_id)
            .eq("is_active", true);

          if (connections && connections.length > 0) {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (NOTEBOOK_PASS) headers["Authorization"] = `Bearer ${NOTEBOOK_PASS}`;

            const searchQuery = `${name} ${description || ""} ${game_name || ""}`.trim();
            const passages: string[] = [];

            for (const conn of connections.slice(0, 3)) {
              try {
                const baseUrl = (conn.api_url || NOTEBOOK_URL).replace(/\/$/, "");
                const r = await fetch(`${baseUrl}/api/search`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ query: searchQuery, notebook_id: conn.notebook_id }),
                });
                if (r.ok) {
                  const result = await r.json();
                  const items = result?.results || result?.data || [];
                  for (const item of (Array.isArray(items) ? items : []).slice(0, 3)) {
                    const text = item?.text || item?.content || item?.snippet || "";
                    if (text) passages.push(text);
                  }
                }
              } catch {
                // skip failing notebook
              }
            }

            if (passages.length > 0) {
              ragContext = "\n\nRelevant game context from knowledge base:\n" +
                passages.map((p, i) => `[${i + 1}] ${p}`).join("\n");
            }
          }
        }
      } catch (e) {
        console.error("RAG lookup failed (non-fatal):", e);
      }
    }

    // --- Build prompt ---
    const fieldInstruction = field === "intro"
      ? "Write an immersive narrative INTRODUCTION (3-5 sentences) for this quest. You are addressing the player directly as the protagonist of an unfolding story. Build mystery, tension, and stakes — make the player feel they are stepping into something dangerous, rare, or legendary. Reference specific locations, characters, factions, or lore elements from the game world using your knowledge. End with a compelling call to adventure that makes enrollment irresistible."
      : "Write a triumphant narrative CONCLUSION (3-5 sentences) for a player who has just completed this quest. Celebrate their accomplishment with lore-appropriate grandeur — reference what they overcame, what they proved, and why it matters in the game's world. Make it feel like a cinematic victory moment. The tone should be rewarding, epic, and leave them hungry for the next quest.";

    const tasksPart = Array.isArray(tasks) && tasks.length > 0
      ? `\nQuest objectives: ${tasks.map((t: any) => typeof t === "string" ? t : t.title).join(", ")}`
      : "";

    const draftPart = draft?.trim()
      ? `\nThe admin wrote this draft: "${draft}". Enhance it dramatically while preserving its core intent — elevate the language, weave in game lore, and make it feel like it belongs in the game's universe.`
      : "\nNo draft provided — craft an original narrative from scratch using the quest details and your deep knowledge of this game's world.";

    const systemPrompt = `You are a master storyteller and lore keeper for competitive gaming communities. You write in the voice of an epic narrator — think dark fantasy chronicler, sci-fi mission briefing officer, or legendary sports commentator, depending on the game's genre. You have deep knowledge of every major game's universe, characters, lore, maps, and culture. Your narratives make players feel like heroes in a living story. Write with vivid imagery, dramatic tension, and game-authentic language. Return ONLY the narrative text — no labels, no quotes, no markdown formatting, no prefixes.`;

    const userPrompt = `Quest: "${name}"
Game: ${game_name || "General"}
Difficulty: ${difficulty || "beginner"}
Type: ${challenge_type || "one_time"}
Description: ${description || "N/A"}${tasksPart}

${fieldInstruction}

${draftPart}${ragContext}`;

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
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return json({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      if (status === 402) return json({ error: "AI credits exhausted. Please add funds in workspace settings." }, 402);
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const enhanced_text = data.choices?.[0]?.message?.content?.trim() || "";

    return json({ enhanced_text });
  } catch (e) {
    console.error("enhance-quest-narrative error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
