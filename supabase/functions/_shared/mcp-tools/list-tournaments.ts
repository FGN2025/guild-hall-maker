import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./_shared.ts";

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
