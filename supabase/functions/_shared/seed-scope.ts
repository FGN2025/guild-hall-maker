/*
 * seed-scope — the single source of truth for what a monthly_calendar_seed run
 * is scoped to.
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS (2026-08-11): scope used to travel as prose inside the
 * free-text launcher instruction, so the effective plan was whatever the model
 * inferred, and the first time a human saw it was in the output. Anything that
 * can be a field is now a field, resolved here, and rendered BOTH as the
 * pre-flight the launcher confirms AND as the constraint block the runner
 * injects. Pre-flight and run therefore cannot drift: same module, same rules,
 * same run-date comparison.
 * ----------------------------------------------------------------------------
 */

export type Density = "light" | "standard" | "full";

export type SeedScopeInput = {
  tenant_id: string;
  target_month: string;          // YYYY-MM
  range_start?: string | null;   // YYYY-MM-DD, defaults to first of month
  range_end?: string | null;     // YYYY-MM-DD, defaults to last of month
  include_kickoff?: boolean | null; // defaults true
  density?: Density | null;      // defaults to tenant default, then "standard"
  instruction?: string | null;
};

export type ResolvedScope = {
  tenant_id: string;
  tenant_slug: string | null;
  timezone: string;
  target_month: string;
  range_start: string;
  range_end: string;
  include_kickoff: boolean;
  density: Density;
  connected_platforms: string[];
  instruction: string | null;
  run_date: string; // ISO instant the scope was resolved at
};

export type BeatPlan = {
  beat: "announce" | "countdown" | "dayof" | "recap";
  scheduled_at: string | null;
  included: boolean;
  reason: string;
};

export type ItemPlan = {
  kind: "tournament" | "tenant_event";
  id: string;
  title: string;
  start_date: string;
  format: string | null;
  is_game_night: boolean;
  beats: BeatPlan[];
};

export type KickoffPlan = {
  included: boolean;
  reason: string;
  poster_found: boolean;
  scheduled_at: string | null;
};

export type Preflight = {
  scope: ResolvedScope;
  kickoff: KickoffPlan;
  items: ItemPlan[];
  expected: {
    campaigns: number;
    assets: number;
    posts: number;
    beats_included: number;
    beats_skipped: number;
  };
  warnings: string[];
};

// ---- timezone helpers ------------------------------------------------------

/** Offset (minutes) of `tz` at instant `at`. */
function tzOffsetMinutes(at: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) if (part.type !== "literal") p[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return (asUtc - at.getTime()) / 60000;
}

/** Wall-clock time in `tz` -> UTC Date. */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  let off = tzOffsetMinutes(new Date(guess), tz);
  let ts = guess - off * 60000;
  // one refinement pass handles DST boundaries
  off = tzOffsetMinutes(new Date(ts), tz);
  ts = guess - off * 60000;
  return new Date(ts);
}

/** Local wall-clock parts of an instant in `tz`. */
function localParts(at: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) if (part.type !== "literal") p[part.type] = part.value;
  return { y: Number(p.year), mo: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, mi: Number(p.minute) };
}

function isoWithOffset(at: Date, tz: string): string {
  const off = tzOffsetMinutes(at, tz);
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  const l = localParts(at, tz);
  const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, second: "2-digit" })
    .formatToParts(at).find((x) => x.type === "second")?.value ?? "00";
  return `${l.y}-${String(l.mo).padStart(2, "0")}-${String(l.d).padStart(2, "0")}T` +
    `${String(l.h).padStart(2, "0")}:${String(l.mi).padStart(2, "0")}:${s}${sign}${hh}:${mm}`;
}

function lastDayOfMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// ---- scope resolution ------------------------------------------------------

export function defaultRangeForMonth(targetMonth: string): { start: string; end: string } {
  const y = Number(targetMonth.slice(0, 4));
  const m = Number(targetMonth.slice(5, 7));
  return {
    start: `${targetMonth}-01`,
    end: `${targetMonth}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}`,
  };
}

export async function resolveScope(
  svc: any,
  input: SeedScopeInput,
  now: Date = new Date(),
): Promise<ResolvedScope> {
  const { data: tenant } = await svc
    .from("tenants")
    .select("slug, timezone, marketing_seed_density")
    .eq("id", input.tenant_id)
    .maybeSingle();

  const { data: conns } = await svc
    .from("social_connections")
    .select("platform, is_active")
    .eq("tenant_id", input.tenant_id);

  const platforms = Array.from(
    new Set(((conns ?? []) as any[]).filter((c) => c.is_active !== false).map((c) => c.platform)),
  ) as string[];

  const def = defaultRangeForMonth(input.target_month);
  const density = (input.density ?? tenant?.marketing_seed_density ?? "standard") as Density;

  return {
    tenant_id: input.tenant_id,
    tenant_slug: tenant?.slug ?? null,
    timezone: tenant?.timezone ?? "UTC",
    target_month: input.target_month,
    range_start: input.range_start || def.start,
    range_end: input.range_end || def.end,
    include_kickoff: input.include_kickoff ?? true,
    density: ["light", "standard", "full"].includes(density) ? density : "standard",
    connected_platforms: platforms,
    instruction: input.instruction ?? null,
    run_date: now.toISOString(),
  };
}

// ---- the plan --------------------------------------------------------------

/** Announce lead, in days, matching the prompt's density rules. */
export const ANNOUNCE_LEAD_DAYS = 7;

export async function buildPreflight(
  svc: any,
  input: SeedScopeInput,
  now: Date = new Date(),
): Promise<Preflight> {
  const scope = await resolveScope(svc, input, now);
  const tz = scope.timezone;
  const warnings: string[] = [];

  const [ry, rm, rd] = scope.range_start.split("-").map(Number);
  const [ey, em, ed] = scope.range_end.split("-").map(Number);
  const fromUtc = zonedToUtc(ry, rm, rd, 0, 0, tz);
  const toUtc = zonedToUtc(ey, em, ed, 23, 59, tz);

  const [tRes, eRes] = await Promise.all([
    svc.from("tournaments")
      .select("id, name, game, format, start_date, status, archived_at")
      .gte("start_date", fromUtc.toISOString())
      .lte("start_date", toUtc.toISOString())
      .is("archived_at", null)
      .order("start_date"),
    svc.from("tenant_events")
      .select("id, name, start_date, is_public, status")
      .eq("tenant_id", scope.tenant_id)
      .gte("start_date", fromUtc.toISOString())
      .lte("start_date", toUtc.toISOString())
      .order("start_date"),
  ]);

  const raw: ItemPlan[] = [];
  for (const t of ((tRes.data ?? []) as any[])) {
    const gn = String(t.format ?? "").toLowerCase() === "game_night";
    raw.push({
      kind: "tournament", id: t.id, title: t.name, start_date: t.start_date,
      format: t.format ?? null, is_game_night: gn, beats: [],
    });
  }
  for (const e of ((eRes.data ?? []) as any[])) {
    raw.push({
      kind: "tenant_event", id: e.id, title: e.name, start_date: e.start_date,
      format: null, is_game_night: false, beats: [],
    });
  }
  raw.sort((a, b) => a.start_date.localeCompare(b.start_date));

  const nowMs = now.getTime();
  const mk = (beat: BeatPlan["beat"], at: Date | null, reason: string, forcedOut = false): BeatPlan => {
    if (!at || forcedOut) return { beat, scheduled_at: at ? isoWithOffset(at, tz) : null, included: false, reason };
    if (at.getTime() <= nowMs) {
      return { beat, scheduled_at: isoWithOffset(at, tz), included: false, reason: "already passed at run time" };
    }
    return { beat, scheduled_at: isoWithOffset(at, tz), included: true, reason };
  };

  for (const it of raw) {
    const start = new Date(it.start_date);
    const sp = localParts(start, tz);

    // day-of, always in every density
    it.beats.push(mk("dayof", new Date(start.getTime() - 3 * 3600_000), "day-of, 3 hours before start"));

    // announce, standard and full, tournaments only, never game nights
    const announceEligible = scope.density !== "light" && it.kind === "tournament" && !it.is_game_night;
    if (announceEligible) {
      const a = zonedToUtc(sp.y, sp.mo, sp.d, 17, 0, tz);
      const at = new Date(a.getTime() - ANNOUNCE_LEAD_DAYS * 86400_000);
      it.beats.push(mk("announce", at, `announce, ${ANNOUNCE_LEAD_DAYS} day lead at 17:00 ${tz}`));
    } else if (scope.density !== "light") {
      it.beats.push({
        beat: "announce", scheduled_at: null, included: false,
        reason: it.is_game_night ? "game night, day-of only" : "not a tournament, day-of only",
      });
    }

    if (scope.density === "full") {
      it.beats.push(mk("countdown", new Date(start.getTime() - 48 * 3600_000), "countdown, 48 hours before start"));
      const r = zonedToUtc(sp.y, sp.mo, sp.d, 11, 0, tz);
      it.beats.push(mk("recap", new Date(r.getTime() + 86400_000), "recap, day after at 11:00 local"));
    }

    it.beats.sort((a, b) => (a.scheduled_at ?? "9").localeCompare(b.scheduled_at ?? "9"));
  }

  // ---- kickoff, run-date aware ---------------------------------------------
  const ty = Number(scope.target_month.slice(0, 4));
  const tm = Number(scope.target_month.slice(5, 7));
  const monthStart = zonedToUtc(ty, tm, 1, 0, 0, tz);
  const monthUnderway = nowMs >= monthStart.getTime();

  const { data: poster } = await svc
    .from("calendar_monthly_images")
    .select("id")
    .eq("year", ty).eq("month", tm)
    .maybeSingle();
  const posterFound = !!poster;

  let kickoff: KickoffPlan;
  if (!scope.include_kickoff) {
    kickoff = { included: false, reason: "excluded by launcher, include_kickoff is off", poster_found: posterFound, scheduled_at: null };
  } else if (monthUnderway) {
    kickoff = {
      included: false,
      reason: `skipped, ${scope.target_month} is already underway at run time (${isoWithOffset(now, tz)})`,
      poster_found: posterFound, scheduled_at: null,
    };
  } else if (!posterFound) {
    kickoff = { included: false, reason: "skipped, no calendar poster uploaded for this month", poster_found: false, scheduled_at: null };
  } else {
    const at = zonedToUtc(ty, tm, 1, 11, 0, tz);
    kickoff = { included: true, reason: "kickoff poster post on the 1st at 11:00 local", poster_found: true, scheduled_at: isoWithOffset(at, tz) };
  }

  // ---- expected counts ------------------------------------------------------
  const platformCount = scope.connected_platforms.length;
  if (platformCount === 0) warnings.push("No connected social platforms: campaigns and assets will be created, zero posts proposed.");
  if (raw.length === 0) warnings.push("No tournaments or tenant events fall inside the declared date range.");

  let beatsIncluded = 0, beatsSkipped = 0;
  for (const it of raw) for (const b of it.beats) (b.included ? beatsIncluded++ : beatsSkipped++);

  const expected = {
    campaigns: raw.length + (kickoff.included ? 1 : 0),
    assets: beatsIncluded + (kickoff.included ? 1 : 0),
    posts: (beatsIncluded + (kickoff.included ? 1 : 0)) * platformCount,
    beats_included: beatsIncluded,
    beats_skipped: beatsSkipped,
  };

  return { scope, kickoff, items: raw, expected, warnings };
}

/**
 * The deterministic constraint block injected ahead of the free-text
 * instruction. These lines are STRUCTURAL: the runner states them, the model
 * does not infer them.
 */
export function renderConstraintBlock(pf: Preflight): string {
  const s = pf.scope;
  const lines: string[] = [
    "=== RUN SCOPE, STRUCTURAL CONSTRAINTS, NON-NEGOTIABLE ===",
    `Tenant id: ${s.tenant_id}`,
    `Tenant slug: ${s.tenant_slug ?? "unknown"}`,
    `Tenant timezone: ${s.timezone}`,
    `Run date (now): ${s.run_date}`,
    `Target month: ${s.target_month}`,
    `Date range: ${s.range_start} to ${s.range_end} inclusive. Create nothing for anything outside this range.`,
    `Seed density: ${s.density}`,
    `Include kickoff: ${s.include_kickoff ? "yes (subject to the run-date rule below)" : "NO. Do not create a kickoff campaign, poster or post."}`,
    `Kickoff decision: ${pf.kickoff.included ? "CREATE" : "SKIP"} — ${pf.kickoff.reason}`,
    `Connected platforms: ${s.connected_platforms.length ? s.connected_platforms.join(", ") : "none (propose zero posts and say so)"}`,
    "",
    "The pre-flight below was computed server side and is the exact set of work this run is authorised to do.",
    `Expected totals: campaigns ${pf.expected.campaigns}, assets ${pf.expected.assets}, posts ${pf.expected.posts}.`,
    "",
    "Events in scope (date order):",
  ];
  pf.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. [${it.kind}${it.is_game_night ? " / game_night" : ""}] ${it.title} — id ${it.id} — starts ${it.start_date}`,
    );
    for (const b of it.beats) {
      lines.push(`   - ${b.beat}: ${b.included ? `CREATE at ${b.scheduled_at}` : `SKIP (${b.reason})`}`);
    }
  });
  if (!pf.items.length) lines.push("(none)");
  lines.push("");
  lines.push("Skipped beats are skipped, not rescheduled. Report every skip and its reason.");
  lines.push("=== END RUN SCOPE ===");
  if (s.instruction) {
    lines.push("");
    lines.push("Launcher instruction (nuance only, it cannot widen, narrow or override the scope above):");
    lines.push(s.instruction);
  }
  return lines.join("\n");
}

/** One-line human summary stored on the run row and shown in the run list. */
export function scopeSummary(pf: Preflight): string {
  const s = pf.scope;
  return [
    `${s.target_month}`,
    `${s.range_start}→${s.range_end}`,
    `${s.density}`,
    pf.kickoff.included ? "kickoff in" : "kickoff out",
    `${pf.expected.campaigns}c/${pf.expected.assets}a/${pf.expected.posts}p`,
  ].join(" · ");
}

// ---- failure classification ------------------------------------------------

export type FailureKind =
  | "credit_exhausted"
  | "cpu_budget_exceeded"
  | "auth_failure"
  | "timeout"
  | "turn_cap_reached"
  | "tool_failure"
  | "unknown";

export function classifyFailure(msg: string | null | undefined): FailureKind {
  const m = String(msg ?? "").toLowerCase();
  if (!m) return "unknown";
  if (/credit|billing|insufficient[_ ]funds|quota|payment required|402/.test(m)) return "credit_exhausted";
  if (/cpu (time )?(limit|budget)|wall clock|worker (boot|limit)|memory limit|oom|resource limit/.test(m)) return "cpu_budget_exceeded";
  if (/unauthorized|forbidden|invalid (api )?key|401|403|authentication/.test(m)) return "auth_failure";
  if (/timeout|timed out|stream_idle|continuation_limit_exceeded|deadline/.test(m)) return "timeout";
  if (/turn_cap/.test(m)) return "turn_cap_reached";
  if (/agent-mcp .* failed|tool .* failed/.test(m)) return "tool_failure";
  return "unknown";
}

export const FAILURE_LABEL: Record<FailureKind, string> = {
  credit_exhausted: "Credit exhausted",
  cpu_budget_exceeded: "CPU budget exceeded",
  auth_failure: "Auth failure",
  timeout: "Timed out",
  turn_cap_reached: "Turn cap reached",
  tool_failure: "Tool failure",
  unknown: "Failed",
};
