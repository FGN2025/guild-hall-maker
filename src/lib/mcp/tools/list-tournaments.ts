import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Live `public.tournaments` uses `game` (text) — there is no `game_id` or
// `tenant_id` column. Ladders and tenant_events are separate entities and are
// intentionally excluded from this tool; only the primary tournaments entity
// is returned.

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
  name: "list_tournaments",
  title: "List tournaments",
  description:
    "List tournaments visible to the signed-in user, ordered by start date descending. Excludes archived tournaments.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    try {
      if (!ctx.isAuthenticated()) {
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, game, status, start_date, end_date")
        .is("archived_at", null)
        .order("start_date", { ascending: false })
        .limit(limit ?? 20);

      if (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      const tournaments = (data ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        game: t.game,
        status: t.status,
        starts_at: t.start_date,
        ends_at: t.end_date,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(tournaments, null, 2) }],
        structuredContent: { tournaments },
      };
    } catch (err: any) {
      console.error("[fgn-mcp] list_tournaments failed", err?.message, err?.stack);
      return {
        content: [{ type: "text", text: err?.message ?? "tool execution failed" }],
        isError: true,
      };
    }
  },
});
