import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, description, challenge_type, game_name, difficulty, estimated_minutes, tasks, cover_image_url } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Challenge name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch game guide_content if game_name is provided
    let guideExcerpt = "";
    if (game_name) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);
        const { data: gameRow } = await sb
          .from("games")
          .select("guide_content")
          .eq("name", game_name)
          .maybeSingle();
        if (gameRow?.guide_content) {
          guideExcerpt = gameRow.guide_content.slice(0, 1500);
        }
      } catch (e) {
        console.warn("Failed to fetch game guide:", e);
      }
    }

    // Build rich user prompt
    const parts: string[] = [];
    parts.push(`Challenge: "${name}"`);
    parts.push(`Type: ${challenge_type || "one_time"} | Difficulty: ${difficulty || "beginner"}${estimated_minutes ? ` | Est. ${estimated_minutes} min` : ""}`);
    if (game_name) parts.push(`Game: ${game_name}`);
    if (tasks && tasks.length > 0) {
      parts.push(`Tasks/Objectives:\n${tasks.map((t: string, i: number) => `  ${i + 1}) ${t}`).join("\n")}`);
    }
    if (guideExcerpt) {
      parts.push(`Game Guide Context (use for terminology and mechanics):\n${guideExcerpt}`);
    }
    if (cover_image_url) {
      parts.push(`(A cover image is associated with this challenge — reference its visual theme if relevant.)`);
    }

    const draftPart = description?.trim()
      ? `\nDraft description: "${description}"`
      : "\nNo draft provided — generate one from scratch based on all the context above.";
    parts.push(draftPart);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a gaming community manager writing challenge descriptions for competitive and simulation gamers. 
Write engaging, clear, and motivating descriptions that:
- Reference specific tasks/objectives when provided
- Use game-specific terminology from the guide context when available
- Match the difficulty level in tone (beginner = welcoming, advanced = intense)
- Keep it concise (2-4 sentences max)
- Make players excited to participate
Return ONLY the description text, no quotes or labels.`,
          },
          {
            role: "user",
            content: parts.join("\n"),
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const enhanced_description = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ enhanced_description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enhance-challenge-description error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
