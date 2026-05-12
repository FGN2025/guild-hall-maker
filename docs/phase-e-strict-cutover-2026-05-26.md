# Phase E §8 Strict Cutover — 2026-05-26 16:00 UTC

**Owner:** Play (play.fgn.gg) on-call — verification + standby
**Counterparty:** Academy (fgn.academy) on-call — performs receiver flip
**Reversibility:** Academy-side; Play already strict-only on send (no Play flip)
**Related:** `docs/phase-e-routing-flag.md`, `docs/phase-e-shadow-to-live-runbook.md`, `docs/phase-f-status-and-open-asks.md` §3

---

## Scope

Two changes land together at T0 = **2026-05-26 16:00 UTC**:

1. **Strict HMAC**: Academy receiver rejects unsigned / bad-signature `challenge_completion` webhooks (today: lenient/strict per §10).
2. **`X-App-Key` retirement**: Academy stops accepting the legacy header on the `ecosystem-data-api` poll path. `X-Ecosystem-Key` becomes the sole accepted auth header.

Play side is already aligned (P-3 cutover): `sync-to-academy`, `ecosystem-webhook-dispatch`, and `academy-passport-link` all send only `X-Ecosystem-Key` (and `X-Play-Signature` on dispatch). Verified 2026-05-12 via repo grep — zero residual `X-App-Key` or `FGN_ACADEMY_API_KEY` references in edge functions.

---

## 0. Pre-flip verification (run T-24h, i.e. 2026-05-25 16:00 UTC)

### 0a. Last 7d of dispatch health

```sql
select
  date_trunc('day', created_at) as day,
  count(*) filter (where data_type = 'webhook:challenge_completion') as live_total,
  count(*) filter (where data_type = 'webhook:challenge_completion' and status = 'success') as live_ok,
  count(*) filter (where data_type = 'webhook:challenge_completion' and status <> 'success') as live_fail,
  count(*) filter (where data_type = 'challenge_completion') as direct_residual
from ecosystem_sync_log
where target_app = 'fgn_academy'
  and created_at > now() - interval '7 days'
group by 1 order by 1;
```

**Pass criteria:**
- `live_ok / live_total ≥ 0.99` every day.
- `live_fail` rows: zero 401/403; only transient 5xx acceptable.
- `direct_residual = 0` (confirms `PHASE_E_ROUTING_MODE=live` held the whole window).

### 0b. Repo hygiene
```bash
rg -n "X-App-Key|FGN_ACADEMY_API_KEY" supabase/functions/ src/
```
Expected: doc-string mentions only. Zero in edge function source.

### 0c. Secret inventory
| Secret | Required | State expected |
|---|---|---|
| `ECOSYSTEM_API_KEY` | yes | set, rotated value |
| `PLAY_WEBHOOK_SECRET` | yes | set, rotated, matches Academy fingerprint |
| `PHASE_E_ROUTING_MODE` | yes | `live` |
| `FGN_ACADEMY_API_KEY` | no | retired (delete post-cutover, see §4) |

---

## 1. T-24h notification (2026-05-25 16:00 UTC)

Post to #ecosystem-ops:
> §8 strict cutover T-24h. 7-day parity window: `<live_total>` events, `<live_ok>` success, zero auth failures, zero direct-residual. Play side green. Academy on-call confirmed for 2026-05-26 16:00 UTC flip.

Confirm Academy on-call name + escalation path.

---

## 2. T0 flip (2026-05-26 16:00 UTC)

Performed by Academy. Play standby only.

1. Academy flips receiver: unsigned webhook → 401, missing/wrong `X-Ecosystem-Key` on poll → 401.
2. Capture `T0 = 2026-05-26T16:00:00Z` in #ecosystem-ops.

---

## 3. Post-flip 2h watch

Run every 15 min for the first 2h after T0:

```sql
select data_type, status, count(*), max(created_at)
from ecosystem_sync_log
where target_app = 'fgn_academy'
  and created_at > '2026-05-26T16:00:00Z'
group by 1, 2 order by 1, 2;
```

**Watch for:**
- Any `webhook:challenge_completion` row with `status <> 'success'` → check `error_message` for HTTP 401/403.
- Any spike in dispatcher edge-function error logs.

**Rollback (Academy-side, instant):** Academy reverts receiver to lenient. Play has no flip required (already strict on send). If a Play-side bug surfaces signing wrong bytes, fall back via `PHASE_E_ROUTING_MODE=shadow` per `docs/phase-e-shadow-to-live-runbook.md` §5.

---

## 4. Done criteria (T0 + 7 days)

- 7 days of `live_ok / live_total ≥ 0.99` post-T0.
- Zero rollbacks.
- Academy confirms zero unsigned-reject log entries from Play traffic.

Then:
1. Delete `FGN_ACADEMY_API_KEY` secret (Lovable Cloud → Edge Functions → Secrets).
2. Update `docs/phase-e-routing-flag.md` "Recommended rollout" with actual T0/T1.
3. Mark Phase E shipped + §3 PR P-2 14-day window closed in `docs/phase-f-status-and-open-asks.md`.
4. Append cutover date to `docs/fgn-academy-integration.md` §10.
5. Archive this runbook (rename to `docs/archive/phase-e-strict-cutover-2026-05-26.md`).

---

## 5. Quick reference

```
T-24h    : 2026-05-25 16:00 UTC — verify + notify
T0       : 2026-05-26 16:00 UTC — Academy flips receiver
T0+2h    : intensive watch window
T0+7d    : done criteria → archive + secret cleanup
KILL     : Academy reverts receiver (Play has no flip; signing already strict)
FALLBACK : PHASE_E_ROUTING_MODE = shadow (only if Play-side signing bug)
```
