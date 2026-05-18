
# P0: Academy Sync Retry Queue + Nightly Backfill

Eliminate silent loss of Academy syncs by adding a durable retry queue plus a nightly backfill, with zero changes to the existing happy path.

## Scope

1. **`pgmq` queue** `academy_sync` + dead-letter `academy_sync_dlq`.
2. **Enqueue trigger** on `challenge_completions` whenever a row lands or transitions to `academy_synced IS NOT TRUE`.
3. **New edge function `process-academy-sync-queue`** — drains the queue, calls existing `sync-to-academy` per message, deletes on success, requeues with backoff on transient failure, moves to DLQ after 3 attempts.
4. **New edge function `backfill-academy-sync`** — nightly scan of `challenge_completions` where `academy_synced = false` AND `academy_sync_note NOT LIKE 'user_not_found%'` AND `completed_at > now() - interval '7 days'`; enqueues them.
5. **`pg_cron` schedules**:
   - `process-academy-sync-queue` every 2 minutes.
   - `backfill-academy-sync` daily at 03:15 UTC.
6. **Admin visibility** — extend `EcosystemSyncHealth` with a small "Retry queue" card showing pending count, DLQ count, last drain timestamp (read via new `get_academy_queue_stats` SECURITY DEFINER function, admin-only).
7. **Idempotency safeguard** — `process-academy-sync-queue` skips messages where the completion is already `academy_synced = true` (covers race with moderator-triggered manual sync).

Out of scope (saved for later PRs): achievement/quest sync, task-level streaming, per-completion sync chip on `ChallengeDetail`, URL allowlist, Phase E live cutover.

## Technical notes

### Migration
- `select pgmq.create('academy_sync');` and `pgmq.create('academy_sync_dlq');`
- SECURITY DEFINER helpers: `enqueue_academy_sync(user_id uuid, challenge_id uuid)`, `get_academy_queue_stats()` (admin-only via `has_role`).
- Trigger `trg_enqueue_academy_sync` AFTER INSERT OR UPDATE ON `public.challenge_completions` WHEN (NEW.academy_synced IS NOT TRUE) calls `enqueue_academy_sync`.
- Add `academy_sync_attempts integer DEFAULT 0` column to `challenge_completions` for visibility (also gated in the worker's backoff logic).

### Worker `process-academy-sync-queue`
- `verify_jwt = false` + Bearer `SUPABASE_SERVICE_ROLE_KEY` check (matches the other queue workers per security memory).
- Read batch of 25 with visibility-timeout 120s via `read_email_batch`-style helper (`read_academy_batch`).
- For each: invoke `sync-to-academy` with service-role auth. On `success === true` or `user_not_found === true` → `delete_email`. On any other outcome → if `read_ct >= 3` move to DLQ, else leave for next visibility-timeout tick.
- Stateless admin client (`autoRefreshToken: false, persistSession: false`).

### Backfill `backfill-academy-sync`
- Same auth gate.
- Pull up to 500 stale rows, call `enqueue_academy_sync(user_id, challenge_id)`; rely on queue-side dedupe (worker double-checks `academy_synced`).
- Logs total enqueued to `ecosystem_sync_log` with `data_type = 'academy_backfill'`.

### Cron (uses `pg_cron` + `pg_net`, scheduled via `supabase--insert` per Lovable Cloud guidance)
```
cron.schedule('process-academy-sync-queue', '*/2 * * * *', ...);
cron.schedule('backfill-academy-sync',      '15 3 * * *',  ...);
```

### Files touched
- `supabase/migrations/<ts>_academy_sync_queue.sql` — queues, helpers, trigger, column.
- `supabase/functions/process-academy-sync-queue/index.ts` — new.
- `supabase/functions/backfill-academy-sync/index.ts` — new.
- `src/components/admin/EcosystemSyncHealth.tsx` — add Retry Queue card.
- `src/hooks/useSyncLogs.ts` (or sibling) — small query for `get_academy_queue_stats`.

### Rollback
- Disable cron jobs (one SQL line each) → worker stops, trigger keeps enqueueing but with no consumer; queue grows but causes no user-facing harm. Drop trigger to fully revert.
