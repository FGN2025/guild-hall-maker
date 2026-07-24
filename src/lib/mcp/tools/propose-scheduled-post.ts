import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError, parseIsoWithOffset } from "./_shared";

export default defineTool({
  name: "propose_scheduled_post",
  title: "Propose a scheduled social post",
  description:
    "Create a scheduled_posts row with status='pending_review'. The cron dispatcher only publishes rows with status='pending' (exact match), so agent proposals never publish without tenant-admin approval. scheduled_at MUST be ISO 8601 with an explicit timezone offset (Z or ±HH:MM); stored as UTC. Restrict `platform` to values returned by list_tenants.connected_platforms.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    platform: z.string().describe("One of the tenant's connected_platforms values."),
    image_url: z.string().url().describe("Permanent Supabase Storage URL from attach_tenant_asset_draft.url."),
    caption: z.string().optional(),
    scheduled_at: z.string().describe("ISO 8601 with explicit offset, e.g. 2026-07-24T14:00:00-05:00 or ...Z."),
    campaign_id: z.string().uuid().optional(),
    connection_id: z.string().uuid().optional(),
    idempotency_key: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      const uid = ctx.getUserId();

      let when: Date;
      try { when = parseIsoWithOffset(input.scheduled_at); }
      catch (e: any) { return { content: [{ type: "text", text: e.message }], isError: true }; }

      if (input.idempotency_key) {
        const { data: existing } = await supabase
          .from("scheduled_posts")
          .select("*")
          .eq("tenant_id", input.tenant_id)
          .eq("idempotency_key", input.idempotency_key)
          .maybeSingle();
        if (existing) return okJson({ ...existing, _idempotent: true }, "scheduled_post");
      }

      const { data, error } = await supabase
        .from("scheduled_posts")
        .insert({
          tenant_id: input.tenant_id,
          user_id: uid,
          platform: input.platform,
          image_url: input.image_url,
          caption: input.caption ?? "",
          scheduled_at: when.toISOString(),
          status: "pending_review",
          agent_source: "claude-mcp",
          proposed_by: uid,
          campaign_id: input.campaign_id ?? null,
          connection_id: input.connection_id ?? null,
          idempotency_key: input.idempotency_key ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      // Flag 2: return conflict info to the agent so it can reschedule immediately.
      const { data: conflict } = await supabase.rpc("check_schedule_conflict", {
        _tenant_id: input.tenant_id,
        _platform: input.platform,
        _scheduled_at: when.toISOString(),
        _exclude_id: data.id,
        _window_seconds: 3600,
      });

      return okJson({ ...data, conflict: conflict ?? null }, "scheduled_post");
    } catch (err) {
      return toolError(err, "propose_scheduled_post");
    }
  },
});
