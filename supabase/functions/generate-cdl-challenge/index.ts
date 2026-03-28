import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** 18-point validation benchmark — from spec Section 5 */
function validateChallenge(c: any): { passed: number; total: number; failures: string[] } {
  const failures: string[] = [];
  const checks: [string, boolean][] = [
    ["1. name is non-empty string", typeof c.name === "string" && c.name.trim().length > 0],
    ["2. name starts with 'ATS Skills:'", typeof c.name === "string" && c.name.startsWith("ATS Skills:")],
    ["3. description is non-empty string", typeof c.description === "string" && c.description.trim().length > 0],
    ["4. description is markdown (contains formatting)", typeof c.description === "string" && /[#*\-\n]/.test(c.description)],
    ["5. difficulty is valid enum", ["beginner", "intermediate", "advanced"].includes(c.difficulty)],
    ["6. challenge_type is valid enum", ["one_time", "daily", "weekly", "monthly"].includes(c.challenge_type)],
    ["7. points_reward is positive integer", Number.isInteger(c.points_reward) && c.points_reward > 0],
    ["8. estimated_minutes is positive integer", Number.isInteger(c.estimated_minutes) && c.estimated_minutes > 0],
    ["9. requires_evidence is true", c.requires_evidence === true],
    ["10. cdl_domain is non-empty string", typeof c.cdl_domain === "string" && c.cdl_domain.trim().length > 0],
    ["11. cfr_reference starts with '49 CFR' or 'Part'", typeof c.cfr_reference === "string" && (/^49 CFR/.test(c.cfr_reference) || /^Part/.test(c.cfr_reference))],
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
      cdl_domain, cfr_reference, difficulty, challenge_type,
      game_id, season_id, estimated_minutes, points_reward, created_by,
    } = body;

    if (!cdl_domain) {
      return new Response(JSON.stringify({ error: "cdl_domain is required" }), { status: 400, headers: corsHeaders });
    }

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

    const prompt = `Generate a CDL Trade Skills challenge for the Fiber Gaming Network platform.

CDL Domain: ${cdl_domain}
CFR Reference: ${cfr_reference || ""}
Difficulty: ${difficulty || "beginner"}
Challenge Type: ${challenge_type || "monthly"}
Points Reward: ${points_reward || 10}
Points Second: ${pointsSecond}
Points Third: ${pointsThird}
Points Participation: ${pointsParticipation}
Estimated Minutes: ${estimated_minutes || 50}
Number of Tasks: ${taskCount}
Game: American Truck Simulator (Trucking Simulator)
Season ID: ${season_id || "null"}
Alignment Strength: ${body.alignment_strength || "STRONG"}

Scoring Configuration:
${scoringConfig}

Return a SINGLE JSON object with these exact fields:
{
  "name": "ATS Skills: [descriptive title]",
  "description": "[markdown formatted description with ## headers, bullet points, and clear structure]",
  "certification_description": "[one paragraph explaining the real-world CDL skill this challenge develops]",
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
  "cfr_reference": "${cfr_reference || ""}",
  "coach_context": "[system prompt for the AI Coach — 2-3 sentences explaining what this challenge covers and how the coach should help]",
  "suggested_coach_prompts": ["prompt 1", "prompt 2", "prompt 3"],
  "cover_image_prompt": "[detailed image generation prompt for the challenge cover art]",
  "tasks": [
    { "title": "Task 1 Title", "description": "Task 1 detailed description", "display_order": 1 },
    ...${taskCount} total tasks
  ]
}

IMPORTANT:
- The name MUST start with "ATS Skills:"
- Description MUST be markdown formatted
- Include exactly 3 suggested_coach_prompts
- Include exactly ${taskCount} tasks
- Each task must have title, description, and display_order
- The cover_image_prompt should describe a photorealistic cinematic image suitable for a gaming challenge card
- Return ONLY the JSON object, no additional text`;

    // Query Open Notebook
    const notebookUrl = Deno.env.get("OPEN_NOTEBOOK_URL") || "http://72.62.168.228:8502";
    const notebookPassword = Deno.env.get("OPEN_NOTEBOOK_PASSWORD") || "";
    const notebookId = "notebook:w6l0wjpi39u5nlpaj0k3";

    const chatUrl = `${notebookUrl}/api/notebooks/${notebookId}/chat`;

    console.log(`Querying notebook at ${chatUrl}`);

    const notebookResponse = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notebookPassword}`,
      },
      body: JSON.stringify({ message: prompt, session_id: null }),
    });

    if (!notebookResponse.ok) {
      const errText = await notebookResponse.text();
      console.error("Notebook error:", notebookResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `Notebook query failed: ${notebookResponse.status}`, details: errText }),
        { status: 502, headers: corsHeaders }
      );
    }

    const notebookData = await notebookResponse.json();
    const rawResponse = notebookData.response || notebookData.message || JSON.stringify(notebookData);

    // Extract JSON from response
    let challengeJson: any;
    try {
      const firstBrace = rawResponse.indexOf("{");
      const lastBrace = rawResponse.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("No JSON object found in notebook response");
      }
      const jsonStr = rawResponse.substring(firstBrace, lastBrace + 1);
      challengeJson = JSON.parse(jsonStr);
    } catch (parseErr: any) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse challenge JSON from notebook response",
          details: parseErr.message,
          raw_response: rawResponse,
        }),
        { status: 422, headers: corsHeaders }
      );
    }

    // Run 18-point validation
    const validation = validateChallenge(challengeJson);

    // Separate tasks from challenge fields
    const tasks = challengeJson.tasks || [];
    const challengeFields = { ...challengeJson };
    delete challengeFields.tasks;

    return new Response(
      JSON.stringify({
        challenge: challengeFields,
        tasks,
        validation,
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
