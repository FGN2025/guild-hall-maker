import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError, parseIsoWithOffset } from "./_shared.ts";

export default defineTool({
  name: "update_scheduled_post",
  title: "Update / resubmit scheduled post",
  description:
    "Revise a draft/pending_review/rejected scheduled post. If the row is currently 'rejected', the update flips its status back to 'pending_review' and preserves the existing feedback_note for audit. scheduled_at (if provided) MUST be ISO 8601 with explicit offset. To change the graphic pass `asset_id` (from compose_event_promo / attach_tenant_asset_draft) — the image and storage path are taken from that asset. Passing image_url alone is rejected when it does not belong to an asset.",
  inputSchema: {
    id: z.string().uuid(),
    platform: z.string().optional(),
    asset_id: z.string().uuid().optional().describe("New source asset for this post's graphic."),
    image_url: z.string().url().optional().describe("Legacy path: must be the url of an existing asset."),
    caption: z.string().optional(),
    scheduled_at: z.string().optional(),
    campaign_id: z.string().uuid().nullish(),
    connection_id: z.string().uuid().nullish(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...fields }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);

      const { data: current, error: fetchErr } = await supabase
        .from("scheduled_posts")
        .select("id, status, tenant_id")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!current) return { content: [{ type: "text", text: "Scheduled post not found or access denied." }], isError: true };

      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue;
        if (k === "image_url" || k === "asset_id") continue; // handled below
        if (k === "scheduled_at" && typeof v === "string") {
          try { patch.scheduled_at = parseIsoWithOffset(v).toISOString(); }
          catch (e: any) { return { content: [{ type: "text", text: e.message }], isError: true }; }
        } else {
          patch[k] = v;
        }
      }

      // Graphic changes always resolve through a tenant_marketing_assets row so
      // image, storage path and asset link stay in lockstep.
      if (fields.asset_id || fields.image_url) {
        let q = supabase.from("tenant_marketing_assets").select("id, url, file_path, tenant_id");
        q = fields.asset_id ? q.eq("id", fields.asset_id) : q.eq("url", fields.image_url!);
        const { data: asset } = await q.maybeSingle();
        if (!asset) {
          return {
            content: [{ type: "text", text: "No matching asset. Pass asset_id from compose_event_promo or attach_tenant_asset_draft." }],
            isError: true,
          };
        }
        if ((asset as any).tenant_id !== current.tenant_id) {
          return { content: [{ type: "text", text: "Asset belongs to a different tenant." }], isError: true };
        }
        patch.asset_id = (asset as any).id;
        patch.image_url = (asset as any).url;
        patch.image_path = (asset as any).file_path;
      }

      if (current.status === "rejected") {
        patch.status = "pending_review";
        // feedback_note intentionally preserved
      }

      if (Object.keys(patch).length === 0) {
        return { content: [{ type: "text", text: "No fields provided to update." }], isError: true };
      }

      const { data, error } = await supabase
        .from("scheduled_posts")
        .update(patch)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return { content: [{ type: "text", text: "Scheduled post not editable in its current state." }], isError: true };

      // Flag 2: return conflict info to the agent.
      const { data: conflict } = await supabase.rpc("check_schedule_conflict", {
        _tenant_id: (data as any).tenant_id,
        _platform: (data as any).platform,
        _scheduled_at: (data as any).scheduled_at,
        _exclude_id: (data as any).id,
        _window_seconds: 3600,
      });

      return okJson({ ...data, conflict: conflict ?? null }, "scheduled_post");
    } catch (err) {
      return toolError(err, "update_scheduled_post");
    }
  },
});
