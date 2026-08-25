# Audit Punch List — Fix Plan

Consolidated from the three audit agents (frontend, backend, data/ops). Ordered by risk. Each phase is independently shippable.

## Phase 1 — Security

### 1.1 Close the billing authorization gap (H1)
`create-checkout` trusts `tenant_id`/`price_id` from the request body; `stripe-webhook` then writes subscription state from that metadata. Any signed-in user can start checkout against any tenant.

- In `create-checkout`: resolve the caller from the bearer token (already done), then verify they are a **platform admin** (`has_role`) **or a tenant admin/manager of the given `tenant_id`** (`is_tenant_admin_or_manager`). Reject with 403 otherwise. Never trust body `tenant_id` without this check.
- Apply the same guard to `customer-portal`.
- `stripe-webhook` stays as-is (signature-verified) — it becomes safe once session metadata can no longer be attacker-controlled.
- Verify: a signed-in non-member calling `create-checkout` with another tenant's id gets 403 and no Stripe session is created.
- Closes backlog item `.lovable/backlog/billing-authorization.md` (delete the file when done).

### 1.2 Fix `config.toml` JWT gaps
34 deployed functions have no `verify_jwt` entry (default `true`), including cron/queue/service-invoked workers that Postgres calls with a service-role bearer.

- Add explicit entries for all 34. Set `verify_jwt = false` for machine-invoked functions: `process-academy-*-queue` (5), `process-passport-refresh-queue`, `sync-*-to-academy` (5), `monitor-academy-sync`, `academy-health`, `backfill-academy-sync`, `promo-render`, `promo-rerender`, `reengagement-email`, `tournament-promo-email`, `weekly-recap-email`, and other confirmed service callers.
- Audit each remaining missing entry case-by-case; keep `verify_jwt = true` only where a user JWT is the intended caller.
- Confirm `bulk-register-legacy-users` (currently `verify_jwt=false`) enforces its own admin check in code; add one if missing.

## Phase 2 — Broken / silently-failing features

### 2.1 Tenant Pro upgrade button (H2) — *decision: hide*
- Remove/disable the Upgrade action in `TenantBillingCard.tsx` until real Stripe IDs exist. Leave the placeholder catalog entry with its TODO.

### 2.2 Stuck email queue (H3) — *decision: retry all*
- One-time re-queue of all 155 `email_send_log` rows stuck in `pending` (oldest ~5 months) so the dispatcher attempts them.
- Add a TTL sweep to `process-email-queue`: rows pending past a threshold (e.g. 7 days) are marked `failed` with an explicit reason and surfaced, instead of accumulating silently.

### 2.3 Academy queue processors never run (HIGH)
DB triggers enqueue academy sync work, but no cron ever invokes the processor functions — queues fill and are never drained.

- Check `cron.job` for existing out-of-band schedules first (README claims some exist).
- Add `cron.schedule` jobs (via run_sql, per cron-with-secrets convention) for: `process-academy-achievement-queue`, `process-academy-chain-queue`, `process-academy-quest-queue`, `process-academy-task-queue`, `process-academy-sync-queue` — mirroring the `process-email-queue` pattern.
- `process-passport-refresh-queue` has **no producer and no invoker**: confirm it's dead code from a removed feature; if so, remove the function. If still intended, wire both ends.
- Verify `monitor-academy-sync`, `reengagement-email`, `weekly-recap-email` actually have live cron entries; add any that are missing or correct the README.

### 2.4 nisc-sync stub (HIGH) — *decision: disable with clear error*
- Replace the silent-success placeholder with an explicit "integration not configured" error response.
- Hide/disable the NISC sync trigger in the tenant integrations UI until real API details exist.

## Phase 3 — Cleanup & hygiene

### 3.1 Dead code removal (~687 lines)
- Delete verified-orphan frontend files: `TickerEmbed`, `BrandedPagesList`, `NISCConfigDialog`, `TournamentDetailsDialog` components; `useGlobalAchievements`, `useUserRole`, `useValidateTenantCode` hooks (re-verify zero imports at deletion time).
- Remove one-off harness edge functions left deployed: `dispatch-selector-probe`, `preflight-live-post`, `backfill-academy-sync`.
- `promo-rerender`: nothing calls it — wire it to an admin trigger or drop it (default: drop; `promo-render` covers the distributed path).
- `preview-transactional-email`: keep but document as a manual QA endpoint.

### 3.2 UI stubs
- Remove the disabled "Open in Canva — Coming Soon" button and the dormant `comingSoon` prop.
- Quest Chains — *decision: hide*: remove the admin Chains tab entry points; keep code and schema for a future launch.

### 3.3 Data hygiene
- `bypass_codes`: deactivate the 4 expired-but-`is_active` rows; add an expiry sweep (cron or trigger) so this self-maintains.
- `tenant-marketing` storage: re-run the reference-matching audit (53 of 70 objects currently unreferenced) and **report the list before any deletion** — purge only on explicit confirmation, via the Storage API (never `DELETE FROM storage.objects`).
- `tenant_invitations`: expire or surface the 2 invitations unclaimed >30 days.
- `orphaned_notifications` (60 rows): add a tech-debt/runbook entry with an alert threshold.

### 3.4 Docs & code reconciliation
- Delete `docs/migrations-pending/2026-08-11-scheduled-posts-default-draft.sql` (already applied under a different filename) and close the item in `docs/tech-debt.md`.
- Refresh the stale Aug-10 orphan figures in tech-debt.md with current counts.
- Extract the duplicated radar-chart scoring logic shared by `useComparisonReport` and `usePlayerReport` into one utility.

## Explicitly out of scope (stays on the ledger)
- `pending` vs `pending_review` status-vocabulary rename — valid but risky; remains deferred in tech-debt.md.
- TD-001 proactive RLS policy (zero-row condition still holds) — monitor only.
- `agent_prompts` inactive-version retention policy — optional.
- `handle-email-suppression` / `discord-interactions` external sender confirmation — add README checklist notes only.

## Verification
- Build passes; existing vitest suite green.
- Non-member `create-checkout` call returns 403 (billing fix).
- `cron.job` lists the new academy schedules; one manual processor invocation drains a test queue row.
- Email queue: stuck count drops to 0 after re-queue + dispatcher run; TTL sweep marks a synthetic stale row failed.
- No import errors after dead-code deletion (typecheck + build).

## Technical notes
- Caller checks use existing `public.has_role` / `public.is_tenant_admin_or_manager` security-definer functions — no new schema needed for 1.1.
- Cron jobs carry the project URL and anon key, so they are created via `run_sql`, not a migration (per project convention).
- All storage cleanup goes through the Storage API, never direct `storage.objects` deletes (`protect_delete()` rolls back migrations).
