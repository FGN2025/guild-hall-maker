/**
 * Dispatch controls for publish-scheduled-posts.
 *
 * Two runtime controls, both read from `app_settings` at every tick so either
 * can be thrown without a deploy:
 *
 *   dispatch_kill_switch   "on" | "off"   (absent => off, dispatch runs as today)
 *   publish_quota_daily    number | {"default": n|null, "overrides": {tenant_id: n|null}}
 *   publish_quota_monthly  same shape     (absent => unlimited, dispatch runs as today)
 *
 * Two more keys are written by the dispatcher itself and are not meant to be
 * hand-edited; they exist so a pause does not let the staleness guard mow down
 * the queue:
 *
 *   dispatch_pause_started_at   ISO timestamp of the tick that first saw the switch on
 *   dispatch_stale_grace_until  ISO timestamp until which the stale window is widened
 *   dispatch_stale_grace_seconds  seconds added to the stale window until that instant
 *
 * DEFAULTS PRESERVE TODAY'S BEHAVIOR EXACTLY. With none of these keys present,
 * the kill switch is off, quotas are unlimited, and the stale grace is zero.
 */

export const KEY_KILL_SWITCH = "dispatch_kill_switch";
export const KEY_QUOTA_DAILY = "publish_quota_daily";
export const KEY_QUOTA_MONTHLY = "publish_quota_monthly";
export const KEY_PAUSE_STARTED_AT = "dispatch_pause_started_at";
export const KEY_GRACE_UNTIL = "dispatch_stale_grace_until";
export const KEY_GRACE_SECONDS = "dispatch_stale_grace_seconds";

type Sb = any;

async function readSetting(supabase: Sb, key: string): Promise<string | null> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  const v = data?.value;
  return typeof v === "string" && v.length > 0 ? v : null;
}

async function writeSetting(supabase: Sb, key: string, value: string | null) {
  if (value === null) {
    await supabase.from("app_settings").delete().eq("key", key);
    return;
  }
  await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });
}

function isOn(raw: string | null): boolean {
  if (!raw) return false;
  return ["on", "true", "1", "yes", "enabled", "paused"].includes(raw.trim().toLowerCase());
}

export type QuotaSpec = { default: number | null; overrides: Record<string, number | null> };

export function parseQuota(raw: string | null): QuotaSpec {
  const none: QuotaSpec = { default: null, overrides: {} };
  if (!raw) return none;
  const trimmed = raw.trim();
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum)) return { default: asNum >= 0 ? asNum : null, overrides: {} };
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      const def = Number(parsed.default);
      const overrides: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(parsed.overrides ?? {})) {
        const n = Number(v);
        overrides[k] = Number.isFinite(n) && n >= 0 ? n : null;
      }
      return { default: Number.isFinite(def) && def >= 0 ? def : null, overrides };
    }
  } catch (_) { /* malformed => treat as absent, never block by accident */ }
  return none;
}

export function quotaFor(spec: QuotaSpec, tenantId: string | null): number | null {
  if (tenantId && Object.prototype.hasOwnProperty.call(spec.overrides, tenantId)) {
    return spec.overrides[tenantId];
  }
  return spec.default;
}

export type DispatchControls = {
  killSwitchOn: boolean;
  /** Seconds added to the stale window on this tick (pause recovery grace). */
  staleGraceSeconds: number;
  pauseStartedAt: string | null;
  quotaDaily: QuotaSpec;
  quotaMonthly: QuotaSpec;
};

/**
 * Reads the controls and maintains the pause bookkeeping.
 *
 * Pause semantics:
 *  - While the switch is ON we record when the pause began and return early
 *    from the dispatcher BEFORE the stale sweep, so nothing is failed and
 *    nothing is published. Approved rows stay approved.
 *  - On the first tick after the switch goes OFF we convert the pause duration
 *    into a bounded stale grace: the stale window is widened by the length of
 *    the pause, for a period equal to the length of the pause. That is enough
 *    for the backlog to drain, and it self-clears rather than loosening the
 *    guard forever.
 */
export async function loadDispatchControls(supabase: Sb, now: Date): Promise<DispatchControls> {
  const [killRaw, pauseStartedAt, graceUntil, graceSecondsRaw, dailyRaw, monthlyRaw] = await Promise.all([
    readSetting(supabase, KEY_KILL_SWITCH),
    readSetting(supabase, KEY_PAUSE_STARTED_AT),
    readSetting(supabase, KEY_GRACE_UNTIL),
    readSetting(supabase, KEY_GRACE_SECONDS),
    readSetting(supabase, KEY_QUOTA_DAILY),
    readSetting(supabase, KEY_QUOTA_MONTHLY),
  ]);

  const killSwitchOn = isOn(killRaw);
  let staleGraceSeconds = 0;

  if (killSwitchOn) {
    if (!pauseStartedAt) {
      await writeSetting(supabase, KEY_PAUSE_STARTED_AT, now.toISOString());
    }
  } else if (pauseStartedAt) {
    const startedMs = Date.parse(pauseStartedAt);
    const pausedSeconds = Number.isFinite(startedMs)
      ? Math.max(0, Math.floor((now.getTime() - startedMs) / 1000))
      : 0;
    await writeSetting(supabase, KEY_PAUSE_STARTED_AT, null);
    if (pausedSeconds > 0) {
      await writeSetting(supabase, KEY_GRACE_SECONDS, String(pausedSeconds));
      await writeSetting(
        supabase,
        KEY_GRACE_UNTIL,
        new Date(now.getTime() + pausedSeconds * 1000).toISOString(),
      );
      staleGraceSeconds = pausedSeconds;
    }
  }

  if (!killSwitchOn && staleGraceSeconds === 0 && graceUntil) {
    const untilMs = Date.parse(graceUntil);
    if (Number.isFinite(untilMs) && untilMs > now.getTime()) {
      const secs = Number(graceSecondsRaw);
      if (Number.isFinite(secs) && secs > 0) staleGraceSeconds = secs;
    } else {
      // Grace elapsed; clean up so the window returns to its configured value.
      await writeSetting(supabase, KEY_GRACE_UNTIL, null);
      await writeSetting(supabase, KEY_GRACE_SECONDS, null);
    }
  }

  return {
    killSwitchOn,
    staleGraceSeconds,
    pauseStartedAt: killSwitchOn ? (pauseStartedAt ?? now.toISOString()) : null,
    quotaDaily: parseQuota(dailyRaw),
    quotaMonthly: parseQuota(monthlyRaw),
  };
}

/** UTC day and month boundaries used for quota accounting. */
export function periodStarts(now: Date) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { dayStart, monthStart };
}

/**
 * Counts actual dispatches (published rows) for a tenant in the current UTC day
 * and month. This is deliberately independent of `agent_run_limits`, which caps
 * seed runs, not publishes.
 */
export async function countDispatches(supabase: Sb, tenantId: string, now: Date) {
  const { dayStart, monthStart } = periodStarts(now);
  const [{ count: daily }, { count: monthly }] = await Promise.all([
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .gte("published_at", dayStart.toISOString()),
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .gte("published_at", monthStart.toISOString()),
  ]);
  return { daily: daily ?? 0, monthly: monthly ?? 0 };
}
