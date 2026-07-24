import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "list_page_templates",
  title: "List branded-page templates",
  description:
    "Return curated + universal starting points for landing pages. Each template is a name, category, description, preview image URL, and a JSON array of sections you can pass to propose_branded_page.",
  inputSchema: {
    tenant_id: z.string().uuid().optional().describe("Optional — only used to scope future tenant-private templates; universal templates are returned to all tenants."),
    category: z.string().optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const sb = supabaseForUser(ctx);
      let q = (sb.from("web_page_templates") as any)
        .select("id, name, description, category, preview_image_url, sections, is_universal");
      if (input.category) q = q.eq("category", input.category);
      const { data, error } = await q.order("category", { ascending: true });
      if (error) throw error;
      return okJson(data ?? [], "templates");
    } catch (err) {
      return toolError(err, "list_page_templates");
    }
  },
});
