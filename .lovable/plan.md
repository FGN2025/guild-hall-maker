# Plan: Phase E Parity Watch → §8 Strict Cutover Prep

**Goal:** Safely confirm the live HMAC-signed webhook path is at parity, then stage the 2026-05-26 16:00 UTC strict-mode + `X-App-Key` retirement cutover.

T0 of parity window: 2026-05-12 ~16:22 UTC. Target green: 2026-05-13 ~16:22 UTC (24h min) → 2026-05-14 ~16:22 UTC (48h preferred).

---

## Phase 1 — 48h parity watch (now → T+48h)

Per `docs/phase-e-shadow-to-live-runbook.md` §4d, with `PHASE_E_ROUTING_MODE=live` we expect:
- Continuous `webhook:challenge_completion` rows in `ecosystem_sync_log`, all `status=success`.
- Zero new direct `challenge_completion` rows after T0.
- Zero HMAC failures on Academy receiver.

**Cadence:** check every 4–6h via `ecosystem_sync_log` query (runbook §3a, adapted for live):

```sql
select data_type, status, count(*), max(created_at)
from ecosystem_sync_log
where target_app='fgn_academy'
  and created_at > '2026-05-12T16:22:00Z'
group by 1,2 order by 1,2;
```

**Pass criteria (24h min, 48h preferred):**
| Metric | Threshold |
|---|---|
| `webhook:challenge_completion` success rate | ≥ 99% |
| New direct `challenge_completion` rows post-T0 | 0 |
| Academy-side signature failures | 0 (written confirmation) |
| Rollbacks triggered | 0 |

**Failure response:** instant flip `PHASE_E_ROUTING_MODE` → `shadow` (or `off` if catastrophic). No redeploy. Log trigger symptom in #ecosystem-ops, open follow-up.

---

## Phase 2 — §8 cutover prep (T+24h → 2026-05-26)

§8 = retire legacy `X-App-Key` header path on Academy side; Play already sends only `X-Ecosystem-Key` (per `docs/fgn-academy-integration.md` §10). Cutover is Academy-driven; Play's job is verification + readiness.

### 2a. Verify Play-side hygiene ✅ (2026-05-13)
- Grepped `supabase/functions/` — only residual `X-App-Key` mentions are descriptive comments in `sync-to-academy/index.ts:228` and `AdminGuide.tsx:448` ("legacy X-App-Key retired in P-3"). No live code path.
- `ECOSYSTEM_API_KEY` confirmed as sole outbound auth header on all three push paths: `sync-to-academy` (line 231), `academy-passport-link` (line 121), `ecosystem-webhook-dispatch` (per-row, target-aware).
- `FGN_ACADEMY_API_KEY` retirement scheduled for T0+7d (2026-06-02) per cutover doc §done-criteria.
- HMAC contract filed as canonical: `docs/play-to-academy-hmac-contract-ping.md`. Held for delivery T-24h (2026-05-25 16:00 UTC).

### 2b. Build the cutover checklist (deliver to Academy 24h before flip)
Single doc `docs/phase-e-strict-cutover-2026-05-26.md` containing:
1. Pre-flip verification queries (last 7d of `ecosystem_sync_log`, zero auth failures, zero `X-App-Key` references in dispatcher logs).
2. T0 timestamp capture template.
3. Strict-mode flip steps (Academy receiver flips unsigned-reject + `X-Ecosystem-Key`-only).
4. Post-flip 2h watch — same parity query as Phase 1, looking for any 401/403 spike.
5. Rollback path: Academy reverts to lenient; Play has no flip (already strict-only on send).
6. Done criteria: 7 days clean, then archive.

### 2c. Notify Academy (T-24h, i.e. 2026-05-25 16:00 UTC)
- Post to #ecosystem-ops: "§8 cutover T-24h, parity window closed clean, Play side green."
- Confirm Academy on-call for the flip window.

### 2d. Update existing docs after cutover
- `docs/phase-e-routing-flag.md` — fill in actual T0/T1 dates in "Recommended rollout".
- `docs/phase-f-status-and-open-asks.md` — mark Phase E shipped, mark §3 PR P-2 14-day window closed.
- `docs/fgn-academy-integration.md` §10 — already reflects completion; add cutover date.

---

## Out of scope (explicitly deferred)

- Phase F follow-ups (track-aware Play UI, tenant-scoped Academy telemetry) — wait until §8 lands clean.
- New skill-taxonomy negotiation (§ "Asks for Academy" item 2) — non-blocking, pick up after cutover.

---

## Technical details

**Files to read/touch (Phase 2a only — Phase 1 is monitoring):**
- `supabase/functions/sync-to-academy/index.ts` — verify only `X-Ecosystem-Key` outbound.
- `supabase/functions/ecosystem-webhook-dispatch/index.ts` — already verified clean.
- `supabase/functions/academy-passport-link/index.ts` — verify header set.

**No code changes expected in Phase 1.** Phase 2a may yield a small cleanup PR if any `X-App-Key` references linger; Phase 2b is a new doc only.

**Reversibility:** Phase E flip is a single secret toggle (`PHASE_E_ROUTING_MODE`), no redeploy. §8 cutover is Academy-side; Play's posture is already strict-only.
