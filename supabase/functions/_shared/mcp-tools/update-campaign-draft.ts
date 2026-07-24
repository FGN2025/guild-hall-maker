import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "update_campaign_draft",
  title: "Update marketing campaign draft",
  description:
    "Revise a draft/pending_review/rejected marketing campaign. Cannot change status directly. If the campaign was rejected, address the feedback_note in your changes and follow up with propose_scheduled_post if needed.",
  inputSchema: {
    id: z.string().uuid(),
    title: z.string().min(1).optional(),
    description: z.string().nullish(),
    social_copy: z.string().nullish(),
    target_platforms: z.array(z.string()).optional(),
    source_event_id: z.string().uuid().nullish().describe("Pass a tenant_events.id to link, or null to clear."),
    source_tournament_id: z.string().uuid().nullish().describe("Pass a tournaments.id to link, or null to clear."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...fields }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      if (fields.source_event_id && fields.source_tournament_id) {
        return { content: [{ type: "text", text: "Pass at most one of source_event_id or source_tournament_id." }], isError: true };
      }
      const supabase = supabaseForUser(ctx);
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) if (v !== undefined) patch[k] = v;
      if (Object.keys(patch).length === 0) {
        return { content: [{ type: "text", text: "No fields provided to update." }], isError: true };
      }
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .update(patch)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return { content: [{ type: "text", text: "Campaign not found, not editable, or access denied." }], isError: true };
      return okJson(data, "campaign");
    } catch (err) {
      return toolError(err, "update_campaign_draft");
    }
  },
});
