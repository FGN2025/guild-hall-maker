import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError, parseIsoWithOffset } from "./_shared.ts";

export default defineTool({
  name: "propose_scheduled_post",
  title: "Propose a scheduled social post",
  description:
    "Create a scheduled_posts row with status='pending_review'. The cron dispatcher only publishes rows with status='pending' (exact match), so agent proposals never publish without tenant-admin approval. scheduled_at MUST be ISO 8601 with an explicit timezone offset (Z or ±HH:MM); stored as UTC. Restrict `platform` to values returned by list_tenants.connected_platforms. EVERY post must carry the id of the tenant_marketing_assets row its graphic came from: pass `asset_id` (from compose_event_promo or attach_tenant_asset_draft). The post's image and storage path are taken from that asset, so a post can never silently carry another beat's graphic. If `asset_id` is omitted the tool resolves it from `image_url` and fails when no asset matches.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    platform: z.string().describe("One of the tenant's connected_platforms values."),
    asset_id: z.string().uuid().optional().describe(
      "id of the tenant_marketing_assets row this post's graphic came from (compose_event_promo / attach_tenant_asset_draft). Required in practice; omit only when passing an image_url that already belongs to an existing asset.",
    ),
    image_url: z.string().url().optional().describe("Legacy path: asset URL. Ignored when asset_id is supplied."),
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

      // Bind connection_id at insert time when exactly one active connection exists
      // for the platform. Leaves null when zero or ambiguous — the dispatcher's
      // undeliverable precheck handles the zero case and it will also fall back
      // to the same lookup at dispatch time.
      let resolvedConnectionId: string | null = input.connection_id ?? null;
      if (!resolvedConnectionId && input.platform !== "discord") {
        const { data: activeConns } = await supabase
          .from("social_connections")
          .select("id")
          .eq("tenant_id", input.tenant_id)
          .eq("platform", input.platform)
          .eq("is_active", true)
          .limit(2);
        if (activeConns && activeConns.length === 1) {
          resolvedConnectionId = activeConns[0].id;
        }
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
          connection_id: resolvedConnectionId,
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
