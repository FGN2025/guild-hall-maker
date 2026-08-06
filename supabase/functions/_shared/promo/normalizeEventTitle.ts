// Display-side event title normalization for the promo composer.
// NEVER mutates the source row — the composer calls this purely to decide what
// glyphs to draw. Every transformation is reported back in `rules` + `log` so
// the caller can audit it the same way resolver matches are logged.

export type TitleNormalization = {
  before: string;
  after: string;
  /** Ordered list of rules that actually changed the string. */
  rules: string[];
  /** Set when a guard rejected the normalized form and the raw name was kept. */
  guarded: string | null;
  log: string;
};

// Deliberately conservative: only words that are pure event descriptors.
// Used ONLY for collapsing repeats ("Championship Tournament" -> "Championship").
const DESCRIPTORS = [
  "tournament",
  "tournaments",
  "championship",
  "championships",
  "invitational",
  "showdown",
  "clash",
];

// Wider set used ONLY by the game-strip guard. A remainder built purely from
// these words is anonymous — it names no event, so the game must stay in the
// headline. Includes words we deliberately never collapse (they appear inside
// real game names) because here they are only tested on the post-strip tail.
const GENERIC = [
  ...DESCRIPTORS,
  "game",
  "games",
  "night",
  "nights",
  "cup",
  "open",
  "league",
  "series",
  "event",
  "events",
  "final",
  "finals",
  "match",
  "matches",
  "session",
  "sessions",
  "scrim",
  "scrims",
  "lan",
  "play",
  "playoffs",
];

/** Shortest remainder we accept as a standalone headline. */
const MIN_STANDALONE_CHARS = 12;


const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";

function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function key(s: string): string {
  return s.toLowerCase().replace(/[\u2019'’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Strip a leading `prefix` (word-boundary safe, punctuation tolerant). */
function stripLeading(title: string, prefix: string): string | null {
  const p = key(prefix);
  if (!p) return null;
  const t = key(title);
  if (t === p) return null; // never reduce to nothing
  if (!t.startsWith(`${p} `)) return null;
  // Re-cut the ORIGINAL string at the same word count so casing is preserved.
  const words = title.trim().split(/\s+/);
  const prefixWords = p.split(" ").length;
  const rest = words.slice(prefixWords).join(" ");
  return squash(rest.replace(/^[\s\-–—:|,·•]+/, ""));
}

function collapseDescriptors(s: string): string {
  const seen: string[] = [];
  const kept: string[] = [];
  for (const w of s.split(/\s+/)) {
    const k = key(w);
    if (DESCRIPTORS.includes(k)) {
      if (seen.length) continue; // repeated or second distinct descriptor drops
      seen.push(k);
    }
    kept.push(w);
  }
  return squash(kept.join(" ")).replace(/[\s\-–—:|,·•]+$/, "");
}

/** Every word is a generic event word — names no event on its own. */
function isBare(s: string): boolean {
  const k = key(s);
  if (!k) return true;
  return k.split(" ").every((w) => GENERIC.includes(w));
}

/** Leads with a generic descriptor ("Tournament - Solo / No Build") — reads anonymously. */
function leadsGeneric(s: string): boolean {
  const k = key(s);
  if (!k) return true;
  return GENERIC.includes(k.split(" ")[0]);
}

/**
 * A remainder may replace the full title only when it is genuinely
 * distinguishing on its own: it carries a qualifier beyond generic event
 * words, does not lead with a generic descriptor, and is long enough to read
 * as a name. Otherwise the game name stays in the headline.
 */
function standaloneRejection(s: string): string | null {
  if (isBare(s)) return "bare_descriptor";
  if (leadsGeneric(s)) return "anonymous_qualifier";
  if (key(s).replace(/\s+/g, "").length < MIN_STANDALONE_CHARS) return "too_short";
  return null;
}


export function normalizeEventTitle(args: {
  name: string;
  game?: string | null;
  /** Only stripped when the date is already rendered in the metadata line. */
  dateShown?: boolean;
  tenantName?: string | null;
}): TitleNormalization {
  const before = args.name ?? "";
  const rules: string[] = [];
  let out = squash(before);

  // 1. Leading tenant name ("Acme Fiber Autumn Invitational" -> "Autumn Invitational")
  if (args.tenantName) {
    const stripped = stripLeading(out, args.tenantName);
    if (stripped) { out = stripped; rules.push("strip_leading_tenant"); }
  }

  // 2. Trailing date suffix, only when the date is already in the metadata.
  if (args.dateShown) {
    const dateSuffix = new RegExp(
      `[\\s\\-–—:|,·•(\\[]+((${MONTHS})\\.?\\s*\\d{0,2}(st|nd|rd|th)?(,?\\s*\\d{4})?` +
      `|\\d{1,2}[\\/.\\-]\\d{1,2}([\\/.\\-]\\d{2,4})?` +
      `|(q[1-4]\\s*)?\\d{4})[)\\]]?\\s*$`,
      "i",
    );
    const next = squash(out.replace(dateSuffix, "")).replace(/[\s\-–—:|,·•]+$/, "");
    if (next && next !== out) { out = squash(next); rules.push("strip_trailing_date"); }
  }

  // 3. Collapse redundant descriptors ("Championship Tournament" -> "Championship").
  const collapsed = collapseDescriptors(out);
  if (collapsed && collapsed !== out) { out = collapsed; rules.push("collapse_descriptors"); }

  // 4. Leading game name — stripped ONLY when what remains is genuinely
  //    distinguishing on its own. The headline must carry the most identifying
  //    thing on the graphic; redundancy with the metadata line is a far smaller
  //    sin than an anonymous headline.
  const withGame = out;
  let guarded: string | null = null;
  if (args.game) {
    const stripped = stripLeading(out, args.game);
    if (stripped) {
      const reject = standaloneRejection(stripped);
      if (reject) {
        guarded = reject; // e.g. "Valorant Game Night" -> "Game Night": rejected
      } else {
        out = stripped;
        rules.push("strip_leading_game");
      }
    }
  }

  // Final safety: never emit an empty or degenerate title.
  if (!key(out)) { out = squash(before); guarded = guarded ?? "empty_result"; }
  else if (out !== withGame && standaloneRejection(out)) { out = withGame; guarded = "bare_descriptor"; }


  const after = out;
  const parts = [`before="${before}"`, `after="${after}"`, `rules=[${rules.join(",")}]`];
  if (guarded) parts.unshift(`guard=${guarded}`);
  const log = `title=${guarded ? "guarded" : rules.length ? "normalized" : "unchanged"} ${parts.join(" ")}`;

  return { before, after, rules, guarded, log };
}
