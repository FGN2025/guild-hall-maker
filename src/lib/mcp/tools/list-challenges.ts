import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Columns verified against live `public.challenges`: name, game_id, is_active,
// points_reward, created_at all exist. There is NO `frequency` or `track`
// column. RLS: non-mods only see rows where is_active = true; moderators and
// admins bypass via the manage policy, so is_active=false queries require that
// role.

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_challenges",
  title: "List challenges",
  description:
    "List challenges visible to the signed-in user. Optionally filter by game_id and is_active. Inactive challenges are only returned when the caller is a moderator or admin.",
  inputSchema: {
    game_id: z.string().uuid().optional().describe("Filter by game UUID."),
    is_active: z.boolean().optional().describe("Filter by active flag."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ game_id, is_active, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("challenges")
      .select("id, name, game_id, is_active, points_reward, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (game_id !== undefined) q = q.eq("game_id", game_id);
    if (is_active !== undefined) q = q.eq("is_active", is_active);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { challenges: data ?? [] },
    };
  },
});
