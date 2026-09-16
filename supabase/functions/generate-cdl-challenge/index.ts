import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** 18-point validation benchmark — from spec Section 5 */
function validateChallenge(c: any, titlePrefix: string): { passed: number; total: number; failures: string[] } {
  const failures: string[] = [];
  const checks: [string, boolean][] = [
    ["1. name is non-empty string", typeof c.name === "string" && c.name.trim().length > 0],
    [`2. name starts with '${titlePrefix}'`, typeof c.name === "string" && c.name.startsWith(titlePrefix)],
    ["3. description is non-empty string", typeof c.description === "string" && c.description.trim().length > 0],
    ["4. description is markdown (contains formatting)", typeof c.description === "string" && /[#*\-\n]/.test(c.description)],
    ["5. difficulty is valid enum", ["beginner", "intermediate", "advanced"].includes(c.difficulty)],
    ["6. challenge_type is valid enum", ["one_time", "daily", "weekly", "monthly"].includes(c.challenge_type)],
    ["7. points_reward is positive integer", Number.isInteger(c.points_reward) && c.points_reward > 0],
    ["8. estimated_minutes is positive integer", Number.isInteger(c.estimated_minutes) && c.estimated_minutes > 0],
    ["9. requires_evidence is true", c.requires_evidence === true],
    ["10. cdl_domain is non-empty string", typeof c.cdl_domain === "string" && c.cdl_domain.trim().length > 0],
    ["11. regulatory_reference is non-empty string", typeof c.cfr_reference === "string" && c.cfr_reference.trim().length > 0],
    ["12. certification_description is non-empty", typeof c.certification_description === "string" && c.certification_description.trim().length > 0],
    ["13. coach_context is non-empty", typeof c.coach_context === "string" && c.coach_context.trim().length > 0],
    ["14. suggested_coach_prompts is array of 3", Array.isArray(c.suggested_coach_prompts) && c.suggested_coach_prompts.length === 3],
    ["15. cover_image_prompt is non-empty", typeof c.cover_image_prompt === "string" && c.cover_image_prompt.trim().length > 0],
    ["16. tasks is array with >= 3 items", Array.isArray(c.tasks) && c.tasks.length >= 3],
    ["17. each task has title and description", Array.isArray(c.tasks) && c.tasks.every((t: any) => typeof t.title === "string" && t.title.length > 0 && typeof t.description === "string" && t.description.length > 0)],
    ["18. tasks have display_order", Array.isArray(c.tasks) && c.tasks.every((t: any) => typeof t.display_order === "number")],
  ];

  for (const [label, pass] of checks) {
    if (!pass) failures.push(label);
  }

  return { passed: checks.length - failures.length, total: checks.length, failures };
}

function extractJson(raw: string): any | null {
  try {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) return null;
    return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

/** Lovable AI fallback — streamed and consumed server-side (reasoning runs can be long). */
async function generateWithLovableAI(prompt: string): Promise<{ text: string } | { error: string; status: number }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { error: "LOVABLE_API_KEY is not configured", status: 500 };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: prompt,
      stream: true,
      reasoning: { effort: "low" },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    return { error: `AI generation failed (${res.status}): ${detail.slice(0, 500)}`, status: res.status };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && !text && evt.response?.output_text) {
          text = Array.isArray(evt.response.output_text)
            ? evt.response.output_text.join("")
            : String(evt.response.output_text);
        }
      } catch {
        // ignore keepalive / partial frames
      }
    }
  }

  return { text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // RBAC check
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const hasAccess = (roles ?? []).some((r: any) => ["admin", "moderator"].includes(r.role));
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden — admin or moderator role required" }), { status: 403, headers: corsHeaders });
    }

    // Parse input
    const body = await req.json();
    const {
      cdl_domain, cfr_reference, standard_reference, reference_type, difficulty, challenge_type,
      game_id, game_name, season_id, estimated_minutes, points_reward, trade_area, title_prefix,
    } = body;

    if (!cdl_domain) {
      return new Response(JSON.stringify({ error: "cdl_domain is required" }), { status: 400, headers: corsHeaders });
    }

    const titlePrefix: string = (title_prefix && String(title_prefix).trim()) || "ATS Skills:";
    const tradeArea: string = trade_area || "Transportation & trucking (CDL)";
    const reference: string = standard_reference || cfr_reference || "";

    // Fetch scoring config from app_settings
    const { data: scoringRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "agent_scoring_config")
      .single();

    const scoringConfig = scoringRow?.value ?? "";

    // Build generation prompt
    const pointsSecond = Math.max(1, Math.round((points_reward ?? 10) * 0.6));
    const pointsThird = Math.max(1, Math.round((points_reward ?? 10) * 0.4));
    const pointsParticipation = Math.max(1, Math.round((points_reward ?? 10) * 0.2));
    const taskCount = challenge_type === "one_time" ? 5 : 4;

    const prompt = `Generate a Trade Skills challenge for the Fiber Gaming Network platform.

Trade Area: ${tradeArea}
Skill Domain: ${cdl_domain}
Reference Type: ${reference_type || "federal_cfr"}
Standards / Regulatory Reference: ${reference}
Difficulty: ${difficulty || "beginner"}
Challenge Type: ${challenge_type || "monthly"}
Points Reward: ${points_reward || 10}
Points Second: ${pointsSecond}
Points Third: ${pointsThird}
Points Participation: ${pointsParticipation}
Estimated Minutes: ${estimated_minutes || 50}
Number of Tasks: ${taskCount}
Game: ${game_name || "American Truck Simulator"}
Season ID: ${season_id || "null"}
Alignment Strength: ${body.alignment_strength || "STRONG"}

Scoring Configuration:
${scoringConfig}

Return a SINGLE JSON object with these exact fields:
{
  "name": "${titlePrefix} [descriptive title]",
  "description": "[markdown formatted description with ## headers, bullet points, and clear structure]",
  "certification_description": "[one paragraph explaining the real-world trade skill this challenge develops]",
  "difficulty": "${difficulty || "beginner"}",
  "challenge_type": "${challenge_type || "monthly"}",
  "points_reward": ${points_reward || 10},
  "points_first": ${points_reward || 10},
  "points_second": ${pointsSecond},
  "points_third": ${pointsThird},
  "points_participation": ${pointsParticipation},
  "estimated_minutes": ${estimated_minutes || 50},
  "requires_evidence": true,
  "cdl_domain": "${cdl_domain}",
  "cfr_reference": "${reference}",
  "coach_context": "[system prompt for the AI Coach — 2-3 sentences explaining what this challenge covers and how the coach should help]",
  "suggested_coach_prompts": ["prompt 1", "prompt 2", "prompt 3"],
  "cover_image_prompt": "[detailed image generation prompt for the challenge cover art]",
  "tasks": [
    { "title": "Task 1 Title", "description": "Task 1 detailed description", "display_order": 1 },
    ...${taskCount} total tasks
  ]
}

IMPORTANT:
- The name MUST start with "${titlePrefix}"
- All tasks must be achievable inside ${game_name || "the selected simulator"}
- Description MUST be markdown formatted
- Include exactly 3 suggested_coach_prompts
- Include exactly ${taskCount} tasks
- Each task must have title, description, and display_order
- The cover_image_prompt should describe a photorealistic cinematic image suitable for a gaming challenge card
- Return ONLY the JSON object, no additional text`;

    let challengeJson: any = null;
    let rawResponse = "";
    let source: "notebook" | "ai" = "notebook";
    let notebookNote: string | null = null;

    // Notebook lookup for the selected game (no cross-game default)
    let nbConn: any = null;
    if (game_id) {
      const { data } = await supabase
        .from("admin_notebook_connections")
        .select("api_url, notebook_id")
        .eq("game_id", game_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      nbConn = data;
    }

    if (nbConn?.notebook_id) {
      const notebookUrl = nbConn.api_url || Deno.env.get("OPEN_NOTEBOOK_URL") || "http://72.62.168.228:8502";
      const notebookPassword = Deno.env.get("OPEN_NOTEBOOK_PASSWORD") || "";
      const chatUrl = `${notebookUrl}/api/notebooks/${nbConn.notebook_id}/chat`;

      console.log(`Querying notebook at ${chatUrl}`);

      try {
        const notebookResponse = await fetch(chatUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${notebookPassword}` },
          body: JSON.stringify({ message: prompt, session_id: null }),
        });

        if (notebookResponse.ok) {
          const notebookData = await notebookResponse.json();
          rawResponse = notebookData.response || notebookData.message || JSON.stringify(notebookData);
          challengeJson = extractJson(rawResponse);
          if (!challengeJson) notebookNote = "Notebook returned no usable challenge JSON — fell back to AI.";
        } else {
          const errText = await notebookResponse.text();
          console.error("Notebook error:", notebookResponse.status, errText);
          notebookNote = `Notebook query failed (${notebookResponse.status}) — fell back to AI.`;
        }
      } catch (nbErr: any) {
        console.error("Notebook request error:", nbErr?.message);
        notebookNote = `Notebook unreachable — fell back to AI.`;
      }
    } else {
      notebookNote = "No knowledge notebook connected for this game — generated with AI.";
    }

    // AI fallback
    if (!challengeJson) {
      source = "ai";
      const aiResult = await generateWithLovableAI(
        `You are a vocational trade-skills curriculum designer. Ground the challenge in the named standard and in what is actually possible in the named simulator.\n\n${prompt}`
      );
      if ("error" in aiResult) {
        return new Response(
          JSON.stringify({ error: aiResult.error, notebook_note: notebookNote }),
          { status: aiResult.status >= 400 && aiResult.status < 600 ? aiResult.status : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      rawResponse = aiResult.text;
      challengeJson = extractJson(rawResponse);
    }

    if (!challengeJson) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse challenge JSON from the generated response",
          raw_response: rawResponse,
          notebook_note: notebookNote,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run 18-point validation
    const validation = validateChallenge(challengeJson, titlePrefix);

    // Separate tasks from challenge fields
    const tasks = challengeJson.tasks || [];
    const challengeFields = { ...challengeJson };
    delete challengeFields.tasks;

    return new Response(
      JSON.stringify({
        challenge: challengeFields,
        tasks,
        validation,
        source,
        notebook_note: notebookNote,
        raw_response: rawResponse,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-cdl-challenge error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
