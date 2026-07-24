import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "list_platform_templates",
  title: "List platform marketing templates",
  description:
    "List published platform-wide marketing templates and universal assets the agent can clone into a tenant's private library. When tenant_id is supplied, each row includes `adopted` and `adopted_asset_id` so slate runs can propose localized treatments only for unadopted universal assets. Universal-only mode via universal_only=true.",
  inputSchema: {
    tenant_id: z.string().uuid().optional(),
    universal_only: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tenant_id, universal_only, limit }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      let q = supabase
        .from("marketing_assets")
        .select("id, campaign_id, file_path, url, label, width, height, display_order, created_at, is_universal, universal_published_at, universal_title, universal_campaign_context, usage_notes")
        .order("created_at", { ascending: false })
        .limit(limit ?? 30);
      if (universal_only) q = q.eq("is_universal", true);
      const { data, error } = await q;
      if (error) throw error;

      let adoptionByAsset: Record<string, { adopted: boolean; adopted_asset_id: string | null }> = {};
      if (tenant_id && data && data.length > 0) {
        const ids = data.map((r: any) => r.id);
        const { data: adoptions } = await supabase
          .from("tenant_marketing_assets")
          .select("id, source_asset_id")
          .eq("tenant_id", tenant_id)
          .in("source_asset_id", ids);
        for (const a of adoptions ?? []) {
          adoptionByAsset[(a as any).source_asset_id] = {
            adopted: true,
            adopted_asset_id: (a as any).id,
          };
        }
      }

      const enriched = (data ?? []).map((r: any) => ({
        ...r,
        adopted: tenant_id ? Boolean(adoptionByAsset[r.id]) : undefined,
        adopted_asset_id: tenant_id ? adoptionByAsset[r.id]?.adopted_asset_id ?? null : undefined,
      }));

      return okJson(enriched, "templates");
    } catch (err) {
      return toolError(err, "list_platform_templates");
    }
  },
});
