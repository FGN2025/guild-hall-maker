import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Columns verified against live `public.games`: id, name, slug, category,
// platform_tags (text[]), is_active, display_order. RLS returns only active
// games to non-admins.

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
  name: "list_games",
  title: "List games",
  description:
    "List active games in the catalog with id, name, slug, category, and platform tags.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    try {
      if (!ctx.isAuthenticated()) {
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("games")
        .select("id, name, slug, category, platform_tags, is_active, display_order")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .limit(limit ?? 50);

      if (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: { games: data ?? [] },
      };
    } catch (err: any) {
      console.error("[fgn-mcp] list_games failed", err?.message, err?.stack);
      return {
        content: [{ type: "text", text: err?.message ?? "tool execution failed" }],
        isError: true,
      };
    }
  },
});
