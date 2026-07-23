import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared";

export default defineTool({
  name: "list_pending_agent_drafts",
  title: "List pending and rejected agent drafts",
  description:
    "For a tenant, list agent-authored campaigns and scheduled posts that are currently 'pending_review', plus any 'rejected' rows updated in the last 30 days (with feedback notes). Use this each turn to prioritize revisions before proposing new work.",
  inputSchema: {
    tenant_id: z.string().uuid(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tenant_id }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();

      const { data: campaigns, error: cErr } = await supabase
        .from("marketing_campaigns")
        .select("id, title, description, social_copy, status, feedback_note, target_platforms, agent_source, proposed_by, created_at, updated_at")
        .eq("tenant_id", tenant_id)
        .not("agent_source", "is", null)
        .or(`status.eq.pending_review,and(status.eq.rejected,updated_at.gte.${thirtyDaysAgo})`)
        .order("updated_at", { ascending: false });
      if (cErr) throw cErr;

      const { data: posts, error: pErr } = await supabase
        .from("scheduled_posts")
        .select("id, campaign_id, platform, caption, image_url, scheduled_at, status, feedback_note, agent_source, proposed_by, created_at, updated_at")
        .eq("tenant_id", tenant_id)
        .not("agent_source", "is", null)
        .or(`status.eq.pending_review,and(status.eq.rejected,updated_at.gte.${thirtyDaysAgo})`)
        .order("updated_at", { ascending: false });
      if (pErr) throw pErr;

      return okJson(
        {
          campaigns: (campaigns ?? []).map((r: any) => ({ kind: "campaign", ...r })),
          scheduled_posts: (posts ?? []).map((r: any) => ({ kind: "scheduled_post", ...r })),
        },
        "drafts",
      );
    } catch (err) {
      return toolError(err, "list_pending_agent_drafts");
    }
  },
});
