/**
 * Shared skill taxonomy for Play challenges.
 *
 * Tags are namespace-prefixed lowercase: `<track>:<skill>`.
 * Sent verbatim to FGN Academy via `sync-to-academy` as `skills_verified`.
 *
 * The list is curated but not enforced — the edge function forwards any
 * value the admin enters so Academy and Play can evolve independently.
 */

export type SkillNamespace = "cdl" | "osha" | "fiber" | "gaming";

export interface SkillTag {
  tag: string;          // e.g. "osha:fall-protection"
  label: string;        // e.g. "Fall Protection"
  namespace: SkillNamespace;
}

export interface SkillGroup {
  namespace: SkillNamespace;
  label: string;        // e.g. "OSHA Safety"
  description: string;
  tags: SkillTag[];
}

const mk = (namespace: SkillNamespace, slug: string, label: string): SkillTag => ({
  tag: `${namespace}:${slug}`,
  label,
  namespace,
});

export const SKILL_GROUPS: SkillGroup[] = [
  {
    namespace: "cdl",
    label: "CDL — Commercial Driving",
    description: "FMCSA 49 CFR 383 knowledge & skills domains.",
    tags: [
      mk("cdl", "pre-trip", "Pre-Trip Inspection"),
      mk("cdl", "backing", "Backing & Parking"),
      mk("cdl", "speed-management", "Speed Management"),
      mk("cdl", "logbook", "Hours of Service / Logbook"),
      mk("cdl", "hazard-perception", "Hazard Perception"),
      mk("cdl", "fuel-mgmt", "Fuel Management"),
      mk("cdl", "cargo-securement", "Cargo Securement"),
      mk("cdl", "hazmat-awareness", "Hazmat Awareness"),
    ],
  },
  {
    namespace: "osha",
    label: "OSHA — Workplace Safety",
    description: "OSHA 10/30 modules and general industry safety.",
    tags: [
      mk("osha", "fall-protection", "Fall Protection"),
      mk("osha", "ppe", "Personal Protective Equipment"),
      mk("osha", "lockout-tagout", "Lockout / Tagout"),
      mk("osha", "hazcom", "Hazard Communication"),
      mk("osha", "electrical-safety", "Electrical Safety"),
      mk("osha", "ladder-safety", "Ladder & Scaffold Safety"),
      mk("osha", "confined-space", "Confined Space Entry"),
    ],
  },
  {
    namespace: "fiber",
    label: "Fiber — Broadband Tech",
    description: "Outside plant and inside plant fiber competencies.",
    tags: [
      mk("fiber", "splicing", "Fusion Splicing"),
      mk("fiber", "otdr", "OTDR Testing"),
      mk("fiber", "installation", "Installation & Drop"),
      mk("fiber", "troubleshooting", "Troubleshooting"),
      mk("fiber", "termination", "Connector Termination"),
      mk("fiber", "documentation", "As-Built Documentation"),
    ],
  },
  {
    namespace: "gaming",
    label: "Gaming Proficiency",
    description: "Transferable esports skills.",
    tags: [
      mk("gaming", "aim", "Aim & Mechanics"),
      mk("gaming", "strategy", "Strategy & Game Sense"),
      mk("gaming", "teamwork", "Teamwork & Communication"),
      mk("gaming", "macro", "Macro / Map Awareness"),
      mk("gaming", "micro", "Micro / Execution"),
      mk("gaming", "vod-review", "VOD Review & Adaptation"),
    ],
  },
];

export const ALL_SKILL_TAGS: SkillTag[] = SKILL_GROUPS.flatMap((g) => g.tags);

const TAG_INDEX = new Map(ALL_SKILL_TAGS.map((t) => [t.tag, t]));

export const isValidSkillTag = (tag: string): boolean => TAG_INDEX.has(tag);

export const getSkillLabel = (tag: string): string => {
  const known = TAG_INDEX.get(tag);
  if (known) return known.label;
  // Free-form fallback: render the slug part with title-case
  const [, slug] = tag.split(":");
  if (!slug) return tag;
  return slug
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
};

export const getSkillNamespace = (tag: string): SkillNamespace | string => {
  const [ns] = tag.split(":");
  return ns || tag;
};
