import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, game_name, description, connection_instructions, field } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Server name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!field || !["description", "connection_instructions"].includes(field)) {
      return new Response(JSON.stringify({ error: "field must be 'description' or 'connection_instructions'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = field === "description"
      ? `You are a gaming community manager writing server descriptions for dedicated gaming servers.
Write engaging, informative descriptions that:
- Reference the game name and server name
- Highlight what makes the server special or fun
- Keep it concise (2-4 sentences max)
- Make players excited to join
Return ONLY the description text, no quotes or labels.`
      : `You are a gaming community manager writing connection instructions for dedicated gaming servers.
Write clear, step-by-step instructions that:
- Are specific to the game mentioned
- Include any relevant technical details (direct connect, server browser, etc.)
- Are easy for beginners to follow
- Keep it brief but thorough (3-6 numbered steps)
Return ONLY the instructions text, no quotes or labels.`;

    const parts: string[] = [];
    parts.push(`Server: "${name}"`);
    if (game_name) parts.push(`Game: ${game_name}`);

    if (field === "description") {
      parts.push(description?.trim()
        ? `Draft description: "${description}"`
        : "No draft provided — generate one from scratch.");
    } else {
      parts.push(connection_instructions?.trim()
        ? `Draft instructions: "${connection_instructions}"`
        : "No draft provided — generate connection instructions from scratch.");
    }

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
          { role: "user", content: parts.join("\n") },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ enhanced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enhance-server-description error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
