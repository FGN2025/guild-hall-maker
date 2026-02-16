import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, game } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const NOTEBOOK_URL = Deno.env.get("OPEN_NOTEBOOK_URL");
    const NOTEBOOK_PASS = Deno.env.get("OPEN_NOTEBOOK_PASSWORD");

    // Extract latest user question for notebook search
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const query = lastUserMsg?.content || "";

    // Search the Open Notebook for relevant context
    let notebookContext = "";
    if (NOTEBOOK_URL && query) {
      try {
        const nbHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (NOTEBOOK_PASS) nbHeaders["Authorization"] = `Bearer ${NOTEBOOK_PASS}`;

        const searchQuery = game ? `${game.name}: ${query}` : query;

        const searchRes = await fetch(`${NOTEBOOK_URL.replace(/\/$/, "")}/api/search`, {
          method: "POST",
          headers: nbHeaders,
          body: JSON.stringify({
            query: searchQuery,
            notebook_id: "notebook:f8y4zed28cky7uibdoia",
          }),
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const passages: string[] = [];
          if (Array.isArray(searchData)) {
            for (const item of searchData.slice(0, 5)) {
              const text = item.content || item.text || item.snippet || JSON.stringify(item);
              if (text) passages.push(text);
            }
          } else if (searchData?.results && Array.isArray(searchData.results)) {
            for (const item of searchData.results.slice(0, 5)) {
              const text = item.content || item.text || item.snippet || JSON.stringify(item);
              if (text) passages.push(text);
            }
          }
          if (passages.length > 0) {
            notebookContext = "\n\n## Relevant Knowledge Base Content:\n" +
              passages.map((p, i) => `[Source ${i + 1}]: ${p}`).join("\n\n");
          }
        } else {
          console.warn("Notebook search failed:", searchRes.status, await searchRes.text());
        }
      } catch (e) {
        console.warn("Notebook search error:", e);
      }
    }

    // Build game-specific context from local guide content
    let gameContext = "";
    if (game) {
      gameContext = `\n\n## Active Game Focus: ${game.name}`;
      if (game.category) gameContext += ` (${game.category})`;
      if (game.description) gameContext += `\nGame Description: ${game.description}`;
      if (game.guide_content) gameContext += `\n\n## Local Game Guide:\n${game.guide_content}`;
    }

    const systemPrompt = `You are the FGN Esports Coach — a knowledgeable, encouraging, and strategic gaming coach for the FGN (Fiber Gaming Network) community. You specialize in esports coaching, game strategy, mechanical skills, and competitive improvement.
${game ? `\nYou are currently coaching the user specifically on **${game.name}**. Focus your answers on this game. Use game-specific terminology, strategies, and mechanics relevant to ${game.name}.` : "\nYou are providing general esports coaching across all games."}

When answering questions:
- Draw from the knowledge base content and game guide provided below when relevant
- If no knowledge base content matches, use your general esports expertise
- Be specific and actionable in your advice
- Use gaming terminology naturally
- Encourage improvement and competitive growth
- Format responses with clear headers and bullet points when helpful
${gameContext}${notebookContext}`;

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
