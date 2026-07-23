import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared";

export default defineTool({
  name: "create_campaign_draft",
  title: "Create marketing campaign draft",
  description:
    "Create a draft marketing campaign for a tenant. Status is always 'pending_review'; a tenant admin must approve before anything publishes. Supply idempotency_key to make retries safe.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    social_copy: z.string().optional(),
    category: z.string().optional().describe("Campaign category (default 'social_media')."),
    target_platforms: z.array(z.string()).optional(),
    idempotency_key: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      const uid = ctx.getUserId();

      if (input.idempotency_key) {
        const { data: existing } = await supabase
          .from("marketing_campaigns")
          .select("*")
          .eq("tenant_id", input.tenant_id)
          .eq("idempotency_key", input.idempotency_key)
          .maybeSingle();
        if (existing) return okJson({ ...existing, _idempotent: true }, "campaign");
      }

      const { data, error } = await supabase
        .from("marketing_campaigns")
        .insert({
          tenant_id: input.tenant_id,
          title: input.title,
          description: input.description ?? null,
          social_copy: input.social_copy ?? null,
          category: input.category ?? "social_media",
          target_platforms: input.target_platforms ?? [],
          status: "pending_review",
          is_published: false,
          agent_source: "claude-mcp",
          proposed_by: uid,
          created_by: uid,
          idempotency_key: input.idempotency_key ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return okJson(data, "campaign");
    } catch (err) {
      return toolError(err, "create_campaign_draft");
    }
  },
});
