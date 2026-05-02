import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "generate" | "enrich" | "section";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      game_id,
      mode,
      section,
      existing_guide,
    }: {
      game_id: string;
      mode: Mode;
      section?: string;
      existing_guide?: string;
    } = await req.json();

    if (!game_id || !mode) {
      return new Response(JSON.stringify({ error: "game_id and mode are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Admin-only authorization
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load game + linked notebook connection
    const { data: game, error: gameErr } = await admin
      .from("games")
      .select("id, name, category, platform_tags, guide_content")
      .eq("id", game_id)
      .maybeSingle();
    if (gameErr || !game) throw new Error("Game not found");

    const { data: connection } = await admin
      .from("admin_notebook_connections")
      .select("api_url, notebook_id, is_active")
      .eq("game_id", game_id)
      .eq("is_active", true)
      .maybeSingle();

    // Pull notebook context via the existing notebook-proxy (search action)
    let notebookContext = "";
    let notebookSourceCount = 0;
    if (connection?.api_url && connection?.notebook_id) {
      const queries = [
        `${game.name} overview controls basics`,
        section ? `${game.name} ${section}` : `${game.name} strategy tips advanced`,
      ];
      const snippets: string[] = [];
      for (const q of queries) {
        try {
          const r = await fetch(`${supabaseUrl}/functions/v1/notebook-proxy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
            },
            body: JSON.stringify({
              action: "search",
              api_url: connection.api_url,
              notebook_id: connection.notebook_id,
              query: q,
            }),
          });
          if (r.ok) {
            const data = await r.json();
            const results = Array.isArray(data) ? data : data?.results ?? data?.matches ?? [];
            for (const item of results.slice(0, 6)) {
              const text =
                item?.content ?? item?.text ?? item?.snippet ?? item?.chunk ?? JSON.stringify(item);
              if (typeof text === "string" && text.trim()) {
                snippets.push(text.trim().slice(0, 800));
                notebookSourceCount++;
              }
            }
          }
        } catch (e) {
          console.warn("notebook search failed:", e);
        }
      }
      notebookContext = snippets.join("\n---\n").slice(0, 8000);
    }

    const draft = (existing_guide ?? game.guide_content ?? "").slice(0, 8000);

    const taskInstruction =
      mode === "generate"
        ? "Write a complete, fresh User Guide in Markdown for this game. Replace any prior draft."
        : mode === "section"
        ? `Rewrite ONLY the "${section}" section. Return the full guide in Markdown with the updated section integrated; preserve all other sections from the draft verbatim. If the section does not exist yet, add it in a logical place.`
        : "Enrich and improve the existing draft in Markdown. Preserve the author's voice and structure; fix gaps, add missing details from the notebook context, tighten language. Do NOT remove sections.";

    const systemPrompt = `You are a senior gaming content writer creating in-app User Guides for players.
Output: GitHub-flavored Markdown only — no code fences around the whole document, no preamble, no commentary.
Structure: use ## headings for top-level sections (e.g. Overview, Controls, Getting Started, Tips & Strategy, Common Pitfalls, Advanced).
Style: clear, practical, second person ("you"). Short paragraphs. Use bullet lists for steps and tips. Avoid fluff.
Source rule: prefer facts grounded in the provided NOTEBOOK CONTEXT. If something is not in the context and not common knowledge for this game, omit it rather than invent.`;

    const userPrompt = [
      `GAME: ${game.name}`,
      `Category: ${game.category}${
        game.platform_tags?.length ? ` | Platforms: ${game.platform_tags.join(", ")}` : ""
      }`,
      ``,
      `TASK: ${taskInstruction}`,
      ``,
      `EXISTING DRAFT (Markdown, may be empty):`,
      `"""`,
      draft || "(empty)",
      `"""`,
      ``,
      `NOTEBOOK CONTEXT (excerpts from the game's Open Notebook — treat as the source of truth):`,
      `"""`,
      notebookContext || "(no notebook linked or no results)",
      `"""`,
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let markdown: string = data.choices?.[0]?.message?.content?.trim() ?? "";
    // Strip an outer ```markdown fence if present
    markdown = markdown.replace(/^```(?:markdown|md)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

    return new Response(
      JSON.stringify({
        markdown,
        notebook_linked: !!connection,
        notebook_source_count: notebookSourceCount,
        mode,
        section: section ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-game-guide error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
