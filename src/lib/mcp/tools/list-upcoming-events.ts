import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared";

export default defineTool({
  name: "list_upcoming_events",
  title: "List upcoming events for a tenant",
  description:
    "List upcoming tournaments and tenant events within the next N days for a tenant the caller belongs to.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    days: z.number().int().min(1).max(180).optional().describe("Look-ahead window in days (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tenant_id, days }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      const windowDays = days ?? 30;
      const now = new Date();
      const until = new Date(now.getTime() + windowDays * 86400_000).toISOString();

      const { data: events } = await supabase
        .from("tenant_events")
        .select("id, name, description, start_date, end_date, image_url, is_public")
        .eq("tenant_id", tenant_id)
        .gte("start_date", now.toISOString())
        .lte("start_date", until)
        .order("start_date");

      const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id, name, game, start_date, end_date, image_url, status")
        .gte("start_date", now.toISOString())
        .lte("start_date", until)
        .is("archived_at", null)
        .order("start_date");

      return okJson(
        {
          tenant_events: events ?? [],
          tournaments: tournaments ?? [],
        },
        "upcoming",
      );
    } catch (err) {
      return toolError(err, "list_upcoming_events");
    }
  },
});
