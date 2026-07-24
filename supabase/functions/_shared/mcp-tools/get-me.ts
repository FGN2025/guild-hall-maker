import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./_shared.ts";


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
        .select("id, user_id, display_name, discord_username, gamer_tag, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return { content: [{ type: "text", text: error.message }], isError: true };
      }
      if (!data) {
        console.warn("[fgn-mcp] get_me: no profiles row for user_id", userId);
      }
      const { data: scoreRows } = await supabase
        .from("season_scores")
        .select("points, points_available")
        .eq("user_id", userId);
      const points = (scoreRows ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);
      const points_available = (scoreRows ?? []).reduce((sum, r) => sum + (r.points_available ?? 0), 0);
      const profileBase = data ?? {
        id: userId,
        user_id: userId,
        display_name: null,
        discord_username: null,
        gamer_tag: null,
        avatar_url: null,
      };
      const profile = { ...profileBase, email, points, points_available };
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
