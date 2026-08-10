import { supabase } from "@/integrations/supabase/client";
import type { ComposePromoArgs } from "@/lib/promo/composePromoLayout";

/**
 * Rebuild composer inputs for a marketing asset that predates
 * `overlay_config.promo` (assets composed before the editor started persisting
 * its inputs).
 *
 * Without this, switching format on a legacy asset can only rescale the frozen
 * layout — headlines authored for 1080x1350 end up as small type in a 1200x628
 * banner. With it, the editor can re-run the real layout engine instead.
 *
 * Returns null when the campaign has no event/tournament to read from; callers
 * then fall back to the proportional reflow.
 */
export async function derivePromoArgs(opts: {
  tenantId?: string | null;
  sourceEventId?: string | null;
  sourceTournamentId?: string | null;
  /** Beat wordmark ("ANNOUNCE", "DAY OF", ...) recovered from the saved layers. */
  beatLabel?: string | null;
}): Promise<ComposePromoArgs | null> {
  const { tenantId, sourceEventId, sourceTournamentId, beatLabel } = opts;

  let event: ComposePromoArgs["event"] | null = null;

  if (sourceTournamentId) {
    const { data } = await supabase
      .from("tournaments")
      .select("name, game, start_date, prize_pool, prize_type")
      .eq("id", sourceTournamentId)
      .maybeSingle();
    if (data) event = data as any;
  }
  if (!event && sourceEventId) {
    const { data } = await supabase
      .from("tenant_events")
      .select("name, game, start_date, prize_pool, prize_type")
      .eq("id", sourceEventId)
      .maybeSingle();
    if (data) event = data as any;
  }
  if (!event) return null;

  let tenantName: string | null = null;
  let primary: string | null = null;
  let accent: string | null = null;
  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, primary_color, accent_color")
      .eq("id", tenantId)
      .maybeSingle();
    tenantName = (tenant as any)?.name ?? null;
    primary = (tenant as any)?.primary_color ?? null;
    accent = (tenant as any)?.accent_color ?? null;
  }

  return {
    event,
    tenantName,
    tenantPrimaryColor: primary,
    tenantAccentColor: accent,
    beatLabel: beatLabel ?? null,
  };
}

/** Best-effort beat label recovery: the composer emits it as a short,
 *  all-caps wordmark, always the first text layer. */
export function beatLabelFromOverlays(overlays: Array<Record<string, any>> | undefined | null): string | null {
  const first = overlays?.[0];
  const text = typeof first?.text === "string" ? first.text.trim() : "";
  if (!text || text.length > 24) return null;
  return text === text.toUpperCase() ? text : null;
}
