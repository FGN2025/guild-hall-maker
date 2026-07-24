import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "get_brand_kit",
  title: "Get tenant brand kit",
  description:
    "Return the tenant's brand kit: colors, logo, connected social platforms, and stored timezone. Caller must be a member of the tenant.",
  inputSchema: {
    tenant_id: z.string().uuid().describe("The tenant UUID (from list_tenants)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tenant_id }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      const { data: tenant, error } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, accent_color, timezone, contact_email")
        .eq("id", tenant_id)
        .maybeSingle();
      if (error) throw error;
      if (!tenant) return { content: [{ type: "text", text: "Tenant not found or access denied" }], isError: true };

      const { data: conns } = await supabase
        .from("social_connections")
        .select("platform, account_name, is_active")
        .eq("tenant_id", tenant_id);

      const brand_kit = {
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.logo_url,
        primary_color: tenant.primary_color,
        accent_color: tenant.accent_color,
        timezone: (tenant as any).timezone ?? "UTC",
        contact_email: tenant.contact_email,
        connected_platforms: (conns ?? [])
          .filter((c: any) => c.is_active !== false)
          .map((c: any) => ({ platform: c.platform, account_name: c.account_name ?? null })),
        voice_notes: null,
        banned_words: [] as string[],
        hashtags: [] as string[],
      };
      return okJson(brand_kit, "brand_kit");
    } catch (err) {
      return toolError(err, "get_brand_kit");
    }
  },
});
