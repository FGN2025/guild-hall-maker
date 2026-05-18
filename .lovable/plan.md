## P1 #3 — Task-Level Streaming to Academy (SHIPPED)

Per-task credit now streams to FGN Academy the moment a `challenge_evidence` row is approved (moderator approval, Steam auto-verify, or future per-task paths), via the same trigger → pgmq → worker → DLQ pipeline used for challenges/quests/achievements.

### What shipped

- **Schema**: `academy_task_synced` / `_at` / `_note` / `_attempts` columns on `challenge_evidence`.
- **Queues**: `academy_task_sync` + `academy_task_sync_dlq`.
- **DB**: `enqueue_academy_task_sync(evidence_id)` + `trg_enqueue_academy_task_sync` (fires only on transition-into-approved when `task_id IS NOT NULL` and not yet synced). `get_academy_queue_stats()` extended with `task_pending` / `task_dlq` / `task_oldest_age_seconds`.
- **Edge functions**: `sync-challenge-task-to-academy` (dispatches `challenge.task_completed` via HMAC-signed `ecosystem-webhook-dispatch`, stable `delivery_id = challenge_task:<user>:<challenge>:<task>`), `process-academy-task-queue` (batch 25, VT 120s, max 3 attempts → DLQ).
- **Cron**: `process-academy-task-queue-every-2min` (`*/2 * * * *`).
- **Admin UI**: 4th queue row "Challenge tasks" in `EcosystemSyncHealth`.

### Rollback
`select cron.unschedule('process-academy-task-queue-every-2min');` then `drop trigger trg_enqueue_academy_task_sync on public.challenge_evidence;`.

### Next
P1 #4 per-tenant sync-health surface, or P1 #5 quest-chain bonus event.
