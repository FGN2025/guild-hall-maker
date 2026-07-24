import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "list_tenants",
  title: "List my tenants",
  description:
    "List tenants the signed-in user belongs to (via tenant_admins). Returns brand-kit summary (primary/accent colors, logo), tenant timezone, and the connected social platform labels available for scheduled posts on that tenant.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      const uid = ctx.getUserId();

      const { data: memberships, error: memErr } = await supabase
        .from("tenant_admins")
        .select("tenant_id, role")
        .eq("user_id", uid);
      if (memErr) throw memErr;
      const tenantIds = (memberships ?? []).map((m: any) => m.tenant_id);
      if (tenantIds.length === 0) return okJson([], "tenants");

      const { data: tenants, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, accent_color, timezone, status")
        .in("id", tenantIds);
      if (tErr) throw tErr;

      const { data: conns } = await supabase
        .from("social_connections")
        .select("tenant_id, platform, account_name, is_active")
        .in("tenant_id", tenantIds);

      const roleByTenant = new Map<string, string>();
      (memberships ?? []).forEach((m: any) => roleByTenant.set(m.tenant_id, m.role));

      const platformsByTenant = new Map<string, { platform: string; account_name: string | null }[]>();
      (conns ?? []).forEach((c: any) => {
        if (c.is_active === false) return;
        const arr = platformsByTenant.get(c.tenant_id) ?? [];
        arr.push({ platform: c.platform, account_name: c.account_name ?? null });
        platformsByTenant.set(c.tenant_id, arr);
      });

      const result = (tenants ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        logo_url: t.logo_url,
        primary_color: t.primary_color,
        accent_color: t.accent_color,
        timezone: t.timezone ?? "UTC",
        status: t.status,
        my_role: roleByTenant.get(t.id) ?? null,
        connected_platforms: platformsByTenant.get(t.id) ?? [],
      }));
      return okJson(result, "tenants");
    } catch (err) {
      return toolError(err, "list_tenants");
    }
  },
});
