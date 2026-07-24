import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "list_branded_pages",
  title: "List branded pages",
  description:
    "List every web_page belonging to a tenant: the always-on Portal Banner (is_tenant_banner=true) and any landing pages. Each row includes publish state, scheduling window, and section count so the agent can decide what to propose.",
  inputSchema: {
    tenant_id: z.string().uuid().describe("Tenant to list pages for. REQUIRED — do not omit."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const sb = supabaseForUser(ctx);
      const { data: pages, error } = await sb
        .from("web_pages")
        .select("id, title, slug, description, is_published, is_tenant_banner, publish_at, unpublish_at, created_at, updated_at")
        .eq("tenant_id", input.tenant_id)
        .order("is_tenant_banner", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const ids = (pages ?? []).map((p: any) => p.id);
      let counts = new Map<string, number>();
      if (ids.length) {
        const { data: secs } = await sb
          .from("web_page_sections")
          .select("page_id")
          .in("page_id", ids);
        for (const s of secs ?? []) {
          counts.set((s as any).page_id, (counts.get((s as any).page_id) ?? 0) + 1);
        }
      }
      const enriched = (pages ?? []).map((p: any) => ({ ...p, section_count: counts.get(p.id) ?? 0 }));
      return okJson(enriched, "pages");
    } catch (err) {
      return toolError(err, "list_branded_pages");
    }
  },
});
