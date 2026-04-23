/**
 * Points Rubric — central helpers for the standardized points system.
 * Source of truth lives in app_settings.points_rubric_config (JSON).
 */

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ChallengeType = "daily" | "weekly" | "monthly" | "one_time";
export type EnforcementMode = "suggest" | "warn" | "enforce";
export type ItemKind = "challenge" | "quest" | "tournament";

export interface PointsRubric {
  version: number;
  enforcement: EnforcementMode;
  challenges: Record<Difficulty, Record<ChallengeType, number>>;
  quests: Record<Difficulty, Record<ChallengeType, number>>;
  quest_chain_bonus_multiplier: number;
  tournaments: {
    participation: Record<Difficulty, number>;
    placement_multipliers: { first: number; second: number; third: number };
  };
  prize_bands: Record<string, [number, number]>;
  deviation_warning_threshold: number;
  monthly_player_cap?: number;
}

export const DEFAULT_RUBRIC: PointsRubric = {
  version: 1,
  enforcement: "suggest",
  challenges: {
    beginner: { daily: 5, weekly: 10, monthly: 20, one_time: 15 },
    intermediate: { daily: 8, weekly: 15, monthly: 35, one_time: 25 },
    advanced: { daily: 12, weekly: 25, monthly: 50, one_time: 40 },
  },
  quests: {
    beginner: { daily: 5, weekly: 10, monthly: 20, one_time: 15 },
    intermediate: { daily: 8, weekly: 15, monthly: 35, one_time: 25 },
    advanced: { daily: 12, weekly: 25, monthly: 50, one_time: 40 },
  },
  quest_chain_bonus_multiplier: 0.25,
  tournaments: {
    participation: { beginner: 3, intermediate: 5, advanced: 8 },
    placement_multipliers: { first: 5, second: 3, third: 2 },
  },
  prize_bands: {
    common: [50, 150],
    rare: [200, 400],
    epic: [500, 800],
    legendary: [1000, 5000],
  },
  deviation_warning_threshold: 0.25,
};

const normDifficulty = (d?: string | null): Difficulty => {
  const v = (d ?? "beginner").toLowerCase();
  if (v === "intermediate" || v === "advanced") return v;
  return "beginner";
};

const normType = (t?: string | null): ChallengeType => {
  const v = (t ?? "one_time").toLowerCase();
  if (v === "daily" || v === "weekly" || v === "monthly" || v === "one_time") return v;
  return "one_time";
};

export const getRecommendedPoints = (
  rubric: PointsRubric,
  kind: ItemKind,
  difficulty?: string | null,
  type?: string | null,
  placement?: "participation" | "first" | "second" | "third",
): number => {
  const d = normDifficulty(difficulty);
  if (kind === "challenge") return rubric.challenges[d][normType(type)];
  if (kind === "quest") return rubric.quests[d][normType(type)];
  // tournaments
  const base = rubric.tournaments.participation[d];
  if (!placement || placement === "participation") return base;
  return base * rubric.tournaments.placement_multipliers[placement];
};

export interface ValidationResult {
  ok: boolean;
  recommended: number;
  delta: number;
  deltaPct: number;
  warning: string | null;
}

export const validatePoints = (
  rubric: PointsRubric,
  kind: ItemKind,
  difficulty: string | null | undefined,
  type: string | null | undefined,
  value: number,
  placement?: "participation" | "first" | "second" | "third",
): ValidationResult => {
  const recommended = getRecommendedPoints(rubric, kind, difficulty, type, placement);
  const delta = value - recommended;
  const deltaPct = recommended > 0 ? Math.abs(delta) / recommended : 0;
  const threshold = rubric.deviation_warning_threshold ?? 0.25;
  const ok = deltaPct <= threshold;
  let warning: string | null = null;
  if (!ok) {
    const direction = delta > 0 ? "above" : "below";
    warning = `Value is ${Math.round(deltaPct * 100)}% ${direction} the recommended ${recommended} pts.`;
  }
  return { ok, recommended, delta, deltaPct, warning };
};

export const getPrizeBand = (
  rubric: PointsRubric,
  rarity: string | null | undefined,
): [number, number] | null => {
  if (!rarity) return null;
  return rubric.prize_bands[rarity.toLowerCase()] ?? null;
};

export const validatePrizeCost = (
  rubric: PointsRubric,
  rarity: string | null | undefined,
  cost: number,
): { ok: boolean; band: [number, number] | null; warning: string | null } => {
  const band = getPrizeBand(rubric, rarity);
  if (!band) return { ok: true, band: null, warning: null };
  const [min, max] = band;
  if (cost < min || cost > max) {
    return { ok: false, band, warning: `Recommended ${rarity} band: ${min}–${max} pts.` };
  }
  return { ok: true, band, warning: null };
};
