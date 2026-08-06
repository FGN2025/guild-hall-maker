// Shared background-art resolver for promo composition.
//
// Hierarchy (first hit wins):
//   1. event_image — the event's own cover art (tournaments/tenant_events.image_url)
//   2. game_cover  — games.cover_image_url, matched on a normalized game name
//   3. plate       — no art; the renderer draws the branded fallback plate
//
// Every resolution returns provenance plus the match details so a run's
// transcript records WHY a given promo looks the way it does.

export type ArtProvenance = "event_image" | "game_cover" | "plate";

export type ResolvedEventArt = {
  url: string | null;
  provenance: ArtProvenance;
  /** Raw game string on the event, if any. */
  gameQuery: string | null;
  /** games.name that was matched, when provenance === 'game_cover'. */
  matchedGameName: string | null;
  matchedGameId: string | null;
  /** How the game row was found. */
  matchMethod: "none" | "exact" | "normalized" | "slug" | "contains";
  /** Human-readable one-liner for the run transcript. */
  log: string;
};

/** Lowercase, strip punctuation/roman-ish noise, collapse whitespace.
 *  "Call of Duty: Black Ops 6" -> "call of duty black ops 6" */
export function normalizeGameName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2019'’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

type GameRow = { id: string; name: string; slug: string | null; cover_image_url: string | null };

/** Minimal shape the resolver needs from a supabase-js client. */
type Queryable = {
  from: (table: string) => any;
};

export async function resolveEventArt(
  event: { image_url?: string | null; game?: string | null; name?: string | null },
  supabase: Queryable,
): Promise<ResolvedEventArt> {
  const gameQuery = (event.game ?? "").trim() || null;

  const eventImage = (event.image_url ?? "").trim();
  if (eventImage) {
    return {
      url: eventImage,
      provenance: "event_image",
      gameQuery,
      matchedGameName: null,
      matchedGameId: null,
      matchMethod: "none",
      log: `art=event_image url=${eventImage}`,
    };
  }

  if (gameQuery) {
    const { data, error } = await supabase
      .from("games")
      .select("id, name, slug, cover_image_url")
      .not("cover_image_url", "is", null);

    if (!error && Array.isArray(data) && data.length) {
      const rows = data as GameRow[];
      const target = normalizeGameName(gameQuery);

      const exact = rows.find((g) => g.name.trim().toLowerCase() === gameQuery.toLowerCase());
      const normalized = exact ?? rows.find((g) => normalizeGameName(g.name) === target);
      const bySlug = normalized ?? rows.find((g) => (g.slug ?? "").toLowerCase() === normalizeGameName(gameQuery).replace(/ /g, "-"));
      // Containment as a last resort, longest name first so
      // "Call of Duty: Black Ops 6" beats a bare "Call of Duty" entry.
      const contains =
        bySlug ??
        [...rows]
          .sort((a, b) => normalizeGameName(b.name).length - normalizeGameName(a.name).length)
          .find((g) => {
            const n = normalizeGameName(g.name);
            return n.length >= 4 && (target.includes(n) || n.includes(target));
          });

      const hit = contains;
      if (hit?.cover_image_url) {
        const method: ResolvedEventArt["matchMethod"] = exact
          ? "exact"
          : normalized
            ? "normalized"
            : bySlug
              ? "slug"
              : "contains";
        return {
          url: hit.cover_image_url,
          provenance: "game_cover",
          gameQuery,
          matchedGameName: hit.name,
          matchedGameId: hit.id,
          matchMethod: method,
          log: `art=game_cover match=${method} query="${gameQuery}" matched="${hit.name}" url=${hit.cover_image_url}`,
        };
      }
    }
  }

  return {
    url: null,
    provenance: "plate",
    gameQuery,
    matchedGameName: null,
    matchedGameId: null,
    matchMethod: "none",
    log: gameQuery
      ? `art=plate reason=no_event_image_and_no_game_cover query="${gameQuery}"`
      : "art=plate reason=no_event_image_and_no_game",
  };
}
