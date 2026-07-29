import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "get_calendar_image",
  title: "Get the platform monthly calendar poster for a month",
  description:
    "Returns the platform-wide monthly calendar poster for the given year and month, or null when no poster has been uploaded. Used by the calendar-seed lane to create the month kickoff campaign. Graceful: a missing poster is NOT an error, it returns { image: null }.",
  inputSchema: {
    year: z.number().int().min(2020).max(2100),
    month: z.number().int().min(1).max(12),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year, month }, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("calendar_monthly_images")
        .select("id, year, month, image_url, storage_path, created_at")
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return okJson(data ?? null, "image");
    } catch (err) {
      return toolError(err, "get_calendar_image");
    }
  },
});
