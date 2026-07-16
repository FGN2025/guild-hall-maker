import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

// challenge_tasks columns verified: id, challenge_id, title, description,
// display_order, verification_type, steam_achievement_api_name,
// steam_playtime_minutes. RLS: tasks visible only when the parent challenge is
// active (moderators/admins bypass).

function supabaseForUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL!;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_challenge",
  title: "Get challenge",
  description:
    "Fetch a single challenge by id along with its ordered tasks (including verification_type).",
  inputSchema: {
    id: z.string().uuid().describe("Challenge UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    try {
      if (!ctx.isAuthenticated()) {
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      const supabase = supabaseForUser(ctx);
      const [challengeRes, tasksRes] = await Promise.all([
        supabase.from("challenges").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("challenge_tasks")
          .select(
            "id, challenge_id, title, description, display_order, verification_type, steam_achievement_api_name, steam_playtime_minutes",
          )
          .eq("challenge_id", id)
          .order("display_order", { ascending: true }),
      ]);

      if (challengeRes.error) {
        return { content: [{ type: "text", text: challengeRes.error.message }], isError: true };
      }
      if (!challengeRes.data) {
        return { content: [{ type: "text", text: "Challenge not found" }], isError: true };
      }
      if (tasksRes.error) {
        return { content: [{ type: "text", text: tasksRes.error.message }], isError: true };
      }
      const payload = { challenge: challengeRes.data, tasks: tasksRes.data ?? [] };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    } catch (err: any) {
      console.error("[fgn-mcp] get_challenge failed", err?.message, err?.stack);
      return {
        content: [{ type: "text", text: err?.message ?? "tool execution failed" }],
        isError: true,
      };
    }
  },
});
