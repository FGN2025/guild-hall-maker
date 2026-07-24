import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "list_tenant_assets",
  title: "List tenant marketing assets",
  description:
    "List assets in a tenant's private branded marketing library. Optionally filter to published-only or agent-authored.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    published_only: z.boolean().optional(),
    agent_only: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tenant_id, published_only, agent_only, limit }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      let q = supabase
        .from("tenant_marketing_assets")
        .select("id, tenant_id, campaign_id, file_name, url, label, is_published, agent_source, source_url, proposed_by, notes, created_at, updated_at")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false })
        .limit(limit ?? 50);
      if (published_only) q = q.eq("is_published", true);
      if (agent_only) q = q.not("agent_source", "is", null);
      const { data, error } = await q;
      if (error) throw error;
      return okJson(data ?? [], "assets");
    } catch (err) {
      return toolError(err, "list_tenant_assets");
    }
  },
});
