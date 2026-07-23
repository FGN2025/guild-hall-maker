import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared";

export default defineTool({
  name: "list_platform_templates",
  title: "List platform marketing templates",
  description:
    "List published platform-wide marketing templates the agent can clone into a tenant's private library.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("marketing_assets")
        .select("id, campaign_id, format, file_url, label, created_at")
        .order("created_at", { ascending: false })
        .limit(limit ?? 30);
      if (error) throw error;
      return okJson(data ?? [], "templates");
    } catch (err) {
      return toolError(err, "list_platform_templates");
    }
  },
});
