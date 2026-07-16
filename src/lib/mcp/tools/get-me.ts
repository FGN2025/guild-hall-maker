import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

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
  name: "get_me",
  title: "Get my profile",
  description:
    "Returns the signed-in user's profile (display name, email, points, tenant).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    try {
      if (!ctx.isAuthenticated()) {
        return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
      }
      const supabase = supabaseForUser(ctx);
      const userId = ctx.getUserId();
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email ?? null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, points, points_available, tenant_id, discord_username")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      const profile = { ...(data ?? { id: userId }), email };
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
        structuredContent: { profile },
      };
    } catch (err: any) {
      console.error("[fgn-mcp] get_me failed", err?.message, err?.stack);
      return {
        content: [{ type: "text", text: err?.message ?? "tool execution failed" }],
        isError: true,
      };
    }
  },
});
