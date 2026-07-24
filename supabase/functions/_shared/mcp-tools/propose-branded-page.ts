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

export default defineTool({
  name: "propose_branded_page",
  title: "Propose a branded landing page (draft)",
  description:
    "Create a DRAFT web_pages row for a tenant with a supplied section array. Never publishes — is_published stays false, so a tenant admin has to hit Publish in the portal. Pass either template_id (to hydrate sections from a template) or sections (direct block array). Passing both replaces the template's sections with the supplied ones.",
  inputSchema: {
    tenant_id: z.string().uuid().describe("Owner tenant. REQUIRED."),
    title: z.string().min(1).max(120),
    slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
    description: z.string().max(500).optional(),
    template_id: z.string().uuid().optional(),
    sections: z.array(SectionSchema).max(30).optional(),
    idempotency_key: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const sb = supabaseForUser(ctx);
      const uid = ctx.getUserId();

      // Idempotency: reuse a matching draft with the same slug for this tenant.
      if (input.idempotency_key) {
        const { data: existing } = await sb
          .from("web_pages")
          .select("*")
          .eq("tenant_id", input.tenant_id)
          .eq("slug", input.slug)
          .maybeSingle();
        if (existing) return okJson({ ...existing, _idempotent: true }, "page");
      }

      let sections = input.sections ?? [];
      if (input.template_id && sections.length === 0) {
        const { data: tpl, error: tplErr } = await (sb.from("web_page_templates") as any)
          .select("sections").eq("id", input.template_id).single();
        if (tplErr) throw tplErr;
        sections = (tpl?.sections ?? []) as any[];
      }

      const { data: page, error: pErr } = await sb
        .from("web_pages")
        .insert({
          tenant_id: input.tenant_id,
          title: input.title,
          slug: input.slug,
          description: input.description ?? null,
          is_published: false,
          created_by: uid,
        } as any)
        .select()
        .single();
      if (pErr) throw pErr;

      if (sections.length) {
        const rows = sections.map((s, i) => ({
          page_id: (page as any).id,
          section_type: s.section_type,
          display_order: i,
          config: s.config ?? {},
        }));
        const { error: sErr } = await sb.from("web_page_sections").insert(rows as any);
        if (sErr) throw sErr;
      }

      return okJson({
        ...(page as any),
        section_count: sections.length,
        preview_hint: "Draft only — tenant admin must approve and publish via /tenant/marketing?tab=webpages.",
      }, "page");
    } catch (err) {
      return toolError(err, "propose_branded_page");
    }
  },
});
