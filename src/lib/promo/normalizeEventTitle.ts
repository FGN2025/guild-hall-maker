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

const DESCRIPTORS = [
  "tournament",
  "championship",
  "championships",
  "invitational",
  "cup",
  "open",
  "series",
  "showdown",
  "clash",
  "league",
  "event",
  "night",
];

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

  // 2. Leading game name — the game already prints on its own metadata line.
  if (args.game) {
    const stripped = stripLeading(out, args.game);
    if (stripped) { out = stripped; rules.push("strip_leading_game"); }
  }

  // 3. Trailing date suffix, only when the date is already in the metadata.
  if (args.dateShown) {
    const dateSuffix = new RegExp(
      `[\\s\\-–—:|,·•(\\[]+((${MONTHS})\\.?\\s*\\d{0,2}(st|nd|rd|th)?(,?\\s*\\d{4})?` +
      `|\\d{1,2}[\\/.\\-]\\d{1,2}([\\/.\\-]\\d{2,4})?` +
      `|(q[1-4]\\s*)?\\d{4})[)\\]]?\\s*$`,
      "i",
    );
    const next = squash(out.replace(dateSuffix, ""));
    if (next && next !== out) { out = next; rules.push("strip_trailing_date"); }
  }

  // 4. Collapse a repeated descriptor ("Championship Tournament" -> "Championship").
  const words = out.split(/\s+/);
  const seen: string[] = [];
  const kept: string[] = [];
  for (const w of words) {
    const k = key(w);
    if (DESCRIPTORS.includes(k) && seen.includes(k)) continue;
    if (DESCRIPTORS.includes(k)) {
      if (seen.length) { seen.push(k); continue; } // second distinct descriptor drops
      seen.push(k);
    }
    kept.push(w);
  }
  const collapsed = squash(kept.join(" "));
  if (collapsed !== out) { out = collapsed; rules.push("collapse_descriptors"); }

  // Guards — a normalization that mangles an unusual title is worse than a
  // redundant one, so fall back to the verbatim source name.
  let guarded: string | null = null;
  const outKey = key(out);
  const bareDescriptor = outKey.length > 0 && outKey.split(" ").every((w) => DESCRIPTORS.includes(w));
  if (!outKey) guarded = "empty_result";
  else if (outKey.length < 3) guarded = "too_short";
  else if (bareDescriptor) guarded = "bare_descriptor";

  if (guarded) out = squash(before);

  const after = out;
  const log = guarded
    ? `title=guarded reason=${guarded} rules=[${rules.join(",")}] before="${before}" after="${after}"`
    : rules.length
      ? `title=normalized rules=[${rules.join(",")}] before="${before}" after="${after}"`
      : `title=unchanged before="${before}"`;

  return { before, after, rules: guarded ? [] : rules, guarded, log };
}
