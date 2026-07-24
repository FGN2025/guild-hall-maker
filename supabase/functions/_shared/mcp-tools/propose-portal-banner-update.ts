import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

const SectionSchema = z.object({
  section_type: z.enum([
    "hero", "text_block", "image_gallery", "cta",
    "embed_widget", "banner", "video", "featured_events",
  ]),
  config: z.record(z.any()).default({}),
});

/**
 * Portal banner edits are site-wide, so the agent NEVER publishes them
 * directly. This tool clones the current banner's sections into a fresh
 * DRAFT landing page tagged with a "portal-banner-proposal" slug prefix,
 * and returns the draft page id. A tenant admin reviews it in
 * /tenant/branding and can copy the sections onto the live banner.
 */
export default defineTool({
  name: "propose_portal_banner_update",
  title: "Propose an update to the portal-wide banner (draft only)",
  description:
    "Draft-edit the tenant's Portal Banner. Creates a DRAFT landing page containing the proposed banner sections; the live banner is never modified. A human must copy the approved sections into the banner via the tenant portal.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    sections: z.array(SectionSchema).min(1).max(10),
    proposal_reason: z.string().min(1).max(500),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const sb = supabaseForUser(ctx);
      const uid = ctx.getUserId();

      const slug = `portal-banner-proposal-${Date.now()}`;
      const { data: page, error: pErr } = await sb
        .from("web_pages")
        .insert({
          tenant_id: input.tenant_id,
          title: "Portal Banner Proposal",
          slug,
          description: input.proposal_reason,
          is_published: false,
          created_by: uid,
        } as any)
        .select()
        .single();
      if (pErr) throw pErr;

      const rows = input.sections.map((s, i) => ({
        page_id: (page as any).id,
        section_type: s.section_type,
        display_order: i,
        config: s.config ?? {},
      }));
      const { error: sErr } = await sb.from("web_page_sections").insert(rows as any);
      if (sErr) throw sErr;

      return okJson({
        ...(page as any),
        note: "This is a DRAFT proposal page, not the live banner. A tenant admin must review and copy the sections onto the Portal Banner from /tenant/branding.",
      }, "proposal");
    } catch (err) {
      return toolError(err, "propose_portal_banner_update");
    }
  },
});
