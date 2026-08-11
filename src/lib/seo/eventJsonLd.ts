import { SITE_URL } from "@/components/Seo";

interface EventLike {
  id: string;
  name: string;
  description?: string | null;
  game?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  image_url?: string | null;
  status?: string | null;
  prize_pool?: string | null;
  max_participants?: number | null;
}

/** Maps our tournament status vocabulary onto schema.org EventStatusType. */
const eventStatus = (status?: string | null) => {
  switch (status) {
    case "cancelled":
      return "https://schema.org/EventCancelled";
    case "completed":
    case "in_progress":
    case "upcoming":
    case "open":
    default:
      return "https://schema.org/EventScheduled";
  }
};

/**
 * Titles frequently already contain the game ("Forza Horizon 6 Tournament -
 * Aug 28"), so only append it when it isn't already present.
 */
export function eventHeadline(name: string, game?: string | null): string {
  if (!game) return name;
  return name.toLowerCase().includes(game.toLowerCase()) ? name : `${name} — ${game}`;
}

/**
 * Builds schema.org Event JSON-LD for a tournament or tenant event. These are
 * online competitions, so attendanceMode is always virtual and the location is
 * a VirtualLocation pointing back at the event page.
 */
export function buildEventJsonLd(
  event: EventLike,
  path: string,
  organizerName = "Fibre Gaming Network",
): Record<string, unknown> {
  const url = `${SITE_URL}${path}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventHeadline(event.name, event.game),
    url,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: eventStatus(event.status),
    location: {
      "@type": "VirtualLocation",
      url,
    },
    organizer: {
      "@type": "Organization",
      name: organizerName,
      url: SITE_URL,
    },
  };

  if (event.description) jsonLd.description = event.description.slice(0, 500);
  if (event.start_date) jsonLd.startDate = event.start_date;
  if (event.end_date) jsonLd.endDate = event.end_date;
  if (event.image_url) jsonLd.image = event.image_url;
  if (event.max_participants) {
    jsonLd.maximumAttendeeCapacity = event.max_participants;
  }

  return jsonLd;
}

/** Strips markdown/HTML noise and clamps copy to a meta-description length. */
export function toMetaDescription(
  input: string | null | undefined,
  fallback: string,
  max = 155,
): string {
  const cleaned = (input ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return fallback;
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}
