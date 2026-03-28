/**
 * CDL Trade Skills Agent — Domain Reference Data
 * 8 CDL domains with CFR references, challenge types, scoring defaults, and cover image prompt themes.
 * Source: FGN CDL Agent Lovable Workflow Spec v1.0, Section 6.
 */

export type ReferenceType = "federal_cfr" | "state_training" | "industry_standard" | "other";

export interface CDLDomainConfig {
  label: string;
  cfrReference: string;
  referenceType: ReferenceType;
  challengeType: "one_time" | "monthly";
  defaultPoints: number;
  defaultMinutes: number;
  alignment: "STRONG" | "PARTIAL" | "INDIRECT";
  coverImageTheme: string;
  taskCount: number;
}

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  federal_cfr: "Federal (CFR)",
  state_training: "State Training Requirement",
  industry_standard: "Industry Standard",
  other: "Other",
};

export const CDL_DOMAINS: Record<string, CDLDomainConfig> = {
  "Safe on-road driving — speed management": {
    label: "Safe on-road driving — speed management",
    cfrReference: "49 CFR 383.113(c)",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 10,
    defaultMinutes: 50,
    alignment: "STRONG",
    coverImageTheme:
      "semi-truck on rain-slicked interstate highway at dusk, speed limit sign prominent",
    taskCount: 4,
  },
  "Pre-trip vehicle inspection": {
    label: "Pre-trip vehicle inspection",
    cfrReference: "49 CFR 383.113(a)",
    referenceType: "federal_cfr",
    challengeType: "one_time",
    defaultPoints: 17,
    defaultMinutes: 65,
    alignment: "PARTIAL",
    coverImageTheme:
      "professional truck driver performing walkaround inspection of cab and trailer at dawn, clipboard visible, detailed mechanical focus",
    taskCount: 5,
  },
  "Basic vehicle control — backing and parking": {
    label: "Basic vehicle control — backing and parking",
    cfrReference: "49 CFR 383.113(b) (4)(5)",
    referenceType: "federal_cfr",
    challengeType: "one_time",
    defaultPoints: 20,
    defaultMinutes: 75,
    alignment: "STRONG",
    coverImageTheme:
      "semi-truck reversing into tight loading dock, urban environment, overhead angle",
    taskCount: 5,
  },
  "Shifting and transmission operation": {
    label: "Shifting and transmission operation",
    cfrReference: "Part 380 Appendix A",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 11,
    defaultMinutes: 55,
    alignment: "STRONG",
    coverImageTheme:
      "driver hands on gear shifter in truck cab cockpit interior, motion blur",
    taskCount: 4,
  },
  "Cargo and weight operations": {
    label: "Cargo and weight operations",
    cfrReference: "49 CFR 383.111(a), Part 392",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 8,
    defaultMinutes: 45,
    alignment: "PARTIAL",
    coverImageTheme:
      "flatbed truck loaded with heavy industrial cargo on mountain highway",
    taskCount: 4,
  },
  "Coupling and uncoupling": {
    label: "Coupling and uncoupling",
    cfrReference: "Part 380 Appendix A",
    referenceType: "federal_cfr",
    challengeType: "one_time",
    defaultPoints: 15,
    defaultMinutes: 60,
    alignment: "PARTIAL",
    coverImageTheme:
      "fifth wheel coupling mechanism close-up, industrial workshop lighting",
    taskCount: 5,
  },
  "Hazard and emergency response": {
    label: "Hazard and emergency response",
    cfrReference: "Part 392",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 9,
    defaultMinutes: 50,
    alignment: "PARTIAL",
    coverImageTheme:
      "semi-truck navigating fog and adverse conditions on isolated highway, dramatic sky",
    taskCount: 4,
  },
  "Hours of service awareness": {
    label: "Hours of service awareness",
    cfrReference: "49 CFR 383.111(a) (iv)",
    referenceType: "federal_cfr",
    challengeType: "monthly",
    defaultPoints: 5,
    defaultMinutes: 30,
    alignment: "INDIRECT",
    coverImageTheme:
      "truck driver reviewing logbook at rest stop, cab interior warm lighting",
    taskCount: 4,
  },
};

/** ATS game_id constant — confirmed in Supabase */
export const ATS_GAME_ID = "f316a9ab-8b32-46e1-b871-7defc9dcb5e5";

/** Cover image prompt template — insert domain visual theme */
export function buildCoverImagePrompt(domainTheme: string): string {
  return `Photorealistic cinematic image for a gaming challenge card: ${domainTheme}. Style: wide-angle, dramatic lighting, high contrast, 16:9 aspect ratio. No text overlays.`;
}

/** Compute derived point values from a base points_reward */
export function computePointsBreakdown(pointsReward: number) {
  return {
    points_first: pointsReward,
    points_second: Math.max(1, Math.round(pointsReward * 0.6)),
    points_third: Math.max(1, Math.round(pointsReward * 0.4)),
    points_participation: Math.max(1, Math.round(pointsReward * 0.2)),
  };
}
