export type FeaturedWindowStatus = "scheduled" | "live" | "expired";

/**
 * Compute the display status of a featured window at a given moment.
 * - expired: end is set and has passed
 * - scheduled: start is in the future
 * - live: otherwise (in window, or no window constraints)
 */
export function featuredWindowStatus(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date()
): FeaturedWindowStatus {
  if (end && new Date(end) <= now) return "expired";
  if (start && new Date(start) > now) return "scheduled";
  return "live";
}

/** True when the item should currently be visible in featured surfaces. */
export function isInFeaturedWindow(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date()
): boolean {
  return featuredWindowStatus(start, end, now) === "live";
}

/** Format a Date for a datetime-local input (local timezone). */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
