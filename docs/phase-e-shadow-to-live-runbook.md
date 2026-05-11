# Phase E Shadow → Live Webhook Flip — Runbook

**Owner:** Play (play.fgn.gg) on-call
**Counterparty:** Academy (fgn.academy) on-call
**Reversibility:** Instant — single edge-function secret change, no redeploy
**Related docs:** `docs/phase-e-routing-flag.md`, `docs/phase-f-status-and-open-asks.md` §6

---

## 0. Prerequisites — verify before any flip

| Check | How | Expected |
|---|---|---|
| Dispatcher deployed | `supabase functions list` | `ecosystem-webhook-dispatch` present |
| Webhook subscription active | `select * from ecosystem_webhooks where target_app='fgn_academy' and event_type='challenge_completion'` | 1 row, `is_active = true` |
| Shared secret in place | edge-function secrets panel | `PLAY_WEBHOOK_SECRET` set to **rotated** value (not placeholder) |
| Ecosystem key in place | edge-function secrets panel | `ECOSYSTEM_API_KEY` set |
| Current routing mode | edge-function secrets panel | `PHASE_E_ROUTING_MODE` = `off` (or unset) |
| Academy receiver state | ping Academy on-call | Receiver in **shadow** (unsigned-accepted, signature logged-only) |

**Do not proceed if `PLAY_WEBHOOK_SECRET` is still the placeholder.** Academy must hand off the rotated secret via OneTimeSecret first.

---

## 1. Env vars / secrets reference

All managed in Lovable Cloud → Edge Functions → Secrets. Read per-invocation, no redeploy needed.

| Secret | Purpose | Owner | Rotation |
|---|---|---|---|
| `PHASE_E_ROUTING_MODE` | Transport selector: `off` \| `shadow` \| `live` | Play | n/a (config knob) |
| `PLAY_WEBHOOK_SECRET` | HMAC-SHA256 signing key, shared with Academy | Joint (Academy generates, Play stores) | Coordinated, OneTimeSecret handoff |
| `ECOSYSTEM_API_KEY` | `X-Ecosystem-Key` header for direct POST + magic-link | Play | Independent of webhook flip |
| `SUPABASE_SERVICE_ROLE_KEY` | Dispatcher reads `ecosystem_webhooks` + writes `ecosystem_sync_log` | Auto | n/a |

Mode semantics (from `phase-e-routing-flag.md`):

| Mode | Direct POST | HMAC dispatch | Authoritative response |
|---|---|---|---|
| `off` | ✅ | ❌ | Direct |
| `shadow` | ✅ | ✅ (fire-and-forget) | Direct |
| `live` | ❌ | ✅ | Dispatch |

---

## 2. Step 1 — Flip `off` → `shadow`

### 2a. Pre-flip baseline (T-0)
Capture last 1h of direct-POST volume so we have a denominator for parity:

```sql
select count(*) as direct_posts_1h
from ecosystem_sync_log
where target_app = 'fgn_academy'
  and data_type = 'challenge_completion'
  and created_at > now() - interval '1 hour';
```

Record the number. Post in #ecosystem-ops with `T0 = <timestamp>`.

### 2b. Flip
1. Edge Functions → Secrets → set `PHASE_E_ROUTING_MODE = shadow`.
2. Save. Takes effect on next `sync-to-academy` invocation (no redeploy).

### 2c. Confirm shadow is firing (within 5 min)
```sql
select count(*) filter (where data_type = 'challenge_completion')        as direct,
       count(*) filter (where data_type = 'webhook:challenge_completion') as shadow
from ecosystem_sync_log
where target_app = 'fgn_academy'
  and created_at > '<T0>';
```

Expected: `shadow > 0` once at least one challenge completion fires after T0. If `shadow` stays at 0 after the next known completion event, **rollback** (§5) and investigate.

---

## 3. Step 2 — Parity watch (24–48h)

### 3a. Metrics to track (run every 4–6h, or set a reminder)

```sql
-- Per-event parity over the watch window
with window as (
  select * from ecosystem_sync_log
  where target_app = 'fgn_academy'
    and created_at > '<T0>'
)
select
  count(*) filter (where data_type = 'challenge_completion')                      as direct_total,
  count(*) filter (where data_type = 'challenge_completion' and status='success') as direct_ok,
  count(*) filter (where data_type = 'webhook:challenge_completion')              as shadow_total,
  count(*) filter (where data_type = 'webhook:challenge_completion' and status='success') as shadow_ok,
  count(*) filter (where data_type = 'webhook:challenge_completion' and status<>'success') as shadow_fail
from window;
```

### 3b. Pass criteria (all must hold to advance to `live`)

| Metric | Threshold |
|---|---|
| `shadow_total / direct_total` | ≥ 0.99 (within 1% of direct) |
| `shadow_ok / shadow_total` | ≥ 0.99 |
| `shadow_fail` HTTP 4xx (signature reject) | **0** — any signature failure blocks the flip |
| Academy-side receiver log | Zero "signature mismatch" entries (Academy confirms in writing) |
| Watch duration | ≥ 24h, prefer 48h spanning a peak window |

### 3c. Failure modes & responses

| Symptom | Likely cause | Action |
|---|---|---|
| `shadow_total = 0` after known completion | Mode not picked up, dispatcher error | Check `ecosystem-webhook-dispatch` logs; verify webhook row `is_active` |
| `shadow_fail` HTTP 401/403 | Signature/secret mismatch | Stop. Re-coordinate `PLAY_WEBHOOK_SECRET` rotation with Academy |
| `shadow_fail` HTTP 5xx | Academy receiver error | Ping Academy; do not advance, but no rollback needed |
| `shadow_fail` network/timeout | Dispatcher fetch error | Check `error_message` column; investigate before advancing |
| Direct vs shadow payload diff (Academy-reported) | Wrapper envelope mismatch | Stop. Diff `ecosystem-webhook-dispatch` body construction vs `sync-to-academy` body |

### 3d. Quick log lookups
- Dispatcher logs: `ecosystem-webhook-dispatch` edge-function logs, filter on `error` or HTTP status
- Direct POST logs: `sync-to-academy` edge-function logs

---

## 4. Step 3 — Flip `shadow` → `live`

Only after §3b pass criteria are met **and** Academy confirms receiver is in **strict** mode (rejects unsigned / bad signatures).

### 4a. Pre-flip
- Post `T1 = <timestamp>` in #ecosystem-ops.
- Confirm Academy receiver is strict (written confirmation in thread).

### 4b. Flip
Edge Functions → Secrets → set `PHASE_E_ROUTING_MODE = live`. Save.

### 4c. Confirm live (within 5 min of next completion)
```sql
select data_type, status, count(*)
from ecosystem_sync_log
where target_app = 'fgn_academy' and created_at > '<T1>'
group by 1, 2 order by 1, 2;
```

Expected:
- `webhook:challenge_completion` rows continue.
- **No new** `challenge_completion` (direct) rows after T1 — direct POST is now skipped.
- All `webhook:challenge_completion` rows `status = success`.

### 4d. Post-flip watch (first 2h)
- Any `status <> success` → immediate rollback to `shadow` (§5).
- Any Academy-reported missing event → immediate rollback to `shadow`.

---

## 5. Rollback

**Reversible at any time, instantly, no redeploy.**

| From | To | When |
|---|---|---|
| `live` | `shadow` | Any dispatch failure post-flip, Academy reports missing/bad events |
| `live` | `off` | Catastrophic — dispatcher broken AND direct POST also needed urgently |
| `shadow` | `off` | Shadow is causing receiver-side noise/errors and we need quiet to debug |

### Procedure
1. Edge Functions → Secrets → set `PHASE_E_ROUTING_MODE` to target value (`shadow` or `off`). Save.
2. Next invocation uses the new mode. No restart, no redeploy.
3. Post `ROLLBACK <from>→<to> at <timestamp>` in #ecosystem-ops with the triggering symptom.
4. Open follow-up issue with: trigger symptom, `ecosystem_sync_log` snippet, dispatcher logs.

### Sanity check after rollback
```sql
select data_type, status, count(*)
from ecosystem_sync_log
where target_app = 'fgn_academy' and created_at > now() - interval '15 minutes'
group by 1, 2;
```
Confirm row mix matches the rolled-back mode (per §1 mode semantics table).

---

## 6. Done criteria

- `PHASE_E_ROUTING_MODE = live` for ≥ 7 days.
- Zero rollbacks in that window.
- Academy confirms receiver in strict mode with zero signature failures.
- Update `docs/phase-e-routing-flag.md` "Recommended rollout" with the actual T0/T1 dates and mark Phase E shipped in `docs/phase-f-status-and-open-asks.md`.

---

## 7. Quick reference card (for the on-call)

```
SECRET TO FLIP : PHASE_E_ROUTING_MODE
VALUES         : off | shadow | live
WATCH TABLE    : ecosystem_sync_log (target_app='fgn_academy')
DIRECT ROWS    : data_type = 'challenge_completion'
SHADOW/LIVE    : data_type = 'webhook:challenge_completion'
SIGNATURE      : X-Play-Signature, HMAC-SHA256 hex, secret = PLAY_WEBHOOK_SECRET
ROLLBACK       : set PHASE_E_ROUTING_MODE back, instant, no redeploy
```
