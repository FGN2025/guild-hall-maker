import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth, okJson, toolError } from "./_shared.ts";

export default defineTool({
  name: "get_calendar_image",
  title: "Get the platform monthly calendar poster for a month",
  description:
    "Returns the platform-wide monthly calendar poster for the given year and month, or null when no poster has been uploaded. The returned image_url is a freshly signed, time-limited URL (the calendar-images bucket is private). Used by the calendar-seed lane to create the month kickoff campaign. Graceful: a missing poster is NOT an error, it returns { image: null }.",
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
      if (!data) return okJson(null, "image");

      // calendar-images is a private bucket: mint a fresh signed URL rather
      // than trusting the (possibly stale) stored image_url.
      const { data: signed } = await supabase.storage
        .from("calendar-images")
        .createSignedUrl((data as any).storage_path, 60 * 60 * 24 * 365);

      return okJson({ ...(data as any), image_url: signed?.signedUrl ?? (data as any).image_url }, "image");
    } catch (err) {
      return toolError(err, "get_calendar_image");
    }
  },
});

