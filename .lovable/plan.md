## P1 #3 — Task-Level Streaming to Academy

Stream individual challenge-task completions to FGN Academy as they happen, instead of waiting for the full-enrollment rollup. Unblocks per-skill credit for partial work and gives Academy real-time progress signal.

### Source of truth

`challenge_evidence` already has a `status` column ('pending' / 'approved' / 'rejected') and a nullable `task_id`. A task is considered "completed" when an evidence row with a non-null `task_id` transitions to `status = 'approved'`. This covers all three paths today:

- **Moderator approval** — sets `status = 'approved'` directly.
- **Steam auto-verification** — `verify-steam-task-completion` inserts/updates the evidence row with `status = 'approved'`.
- **Future per-task manual approvals** — same column write, no new code path.

Idempotency is at the `(challenge_id, user_id, task_id)` grain — multiple evidence rows for the same task only count once.

### Scope

1. **Schema** — on `challenge_evidence`:
   - `academy_task_synced boolean default false`
   - `academy_task_synced_at timestamptz`
   - `academy_task_sync_note text`
   - `academy_task_sync_attempts integer default 0`
   - Partial unique guard `(enrollment_id, task_id) where task_id is not null and status = 'approved'` is **not** added — Steam path already does its own dedupe, and the worker dedupes via `academy_task_synced`.

2. **Queue** (`pgmq`) — `academy_task_sync` + `academy_task_sync_dlq`.

3. **DB plumbing**
   - `enqueue_academy_task_sync(_evidence_id uuid)` SECURITY DEFINER.
   - `trg_enqueue_academy_task_sync` AFTER INSERT OR UPDATE on `challenge_evidence`, fires only when:
     - `NEW.task_id IS NOT NULL`
     - `NEW.status = 'approved'`
     - `OLD.status IS DISTINCT FROM 'approved'` on update (or row is fresh on insert)
     - `NEW.academy_task_synced IS NOT TRUE`
   - Extend `get_academy_queue_stats()` to also return `task_pending`, `task_dlq`, `task_oldest_age_seconds`.

4. **Edge functions** (`verify_jwt = false`, service-role gate, stateless admin client — same pattern as quest/achievement workers):
   - **`sync-challenge-task-to-academy`** — resolves evidence → enrollment → user email + challenge + task + tenant + profile. Dispatches `challenge.task_completed` via `ecosystem-webhook-dispatch`. Stable `delivery_id = "challenge_task:<user_id>:<challenge_id>:<task_id>"` so Academy can dedupe regardless of which evidence row triggered it. Soft-success when no active webhook target. Marks `academy_task_synced = true` via `markRow`.
   - **`process-academy-task-queue`** — batch drain 25, VT 120s, max 3 attempts → DLQ. Skip if `academy_task_synced = true` (covers retries + dup approvals). Bumps `academy_task_sync_attempts`.

5. **Cron** — schedule `process-academy-task-queue` every 2 minutes via `supabase--insert` (anon key bearing, kept out of migration).

6. **Admin UI** — `EcosystemSyncHealth.tsx` Retry Queue card: add fourth row "Challenge tasks" (pending / DLQ / oldest age), reusing the existing `<QueueRow>` layout.

### Event payload

`event_type: "challenge.task_completed"`:

```json
{
  "user_email": "...",
  "external_user_id": "...",
  "challenge": { "id", "name" },
  "task": { "id", "name", "description", "verification_type", "skill_tags" },
  "completed_at": "<evidence.approved_at or now>",
  "evidence_id": "...",
  "metadata": {
    "source": "play.fgn.gg",
    "delivery_id": "challenge_task:<user_id>:<challenge_id>:<task_id>",
    "external_attempt_id": "<evidence_id>",
    "tenant_id", "tenant_slug", "tenant_name", "display_name",
    "auto_verified": <bool from verification_type !== 'manual'>
  }
}
```

### Out of scope

- Roll-up `challenge.completed` event — already handled by P1 #1 challenge sync.
- Reverse path (un-approval → revoke skill credit) — Academy is append-only on credits.
- Backfill of historically approved evidence — volume is moderator-paced, drift can be addressed later if Academy asks.

### Files

```text
supabase/migrations/<ts>_challenge_task_academy_sync.sql   new
supabase/functions/sync-challenge-task-to-academy/index.ts new
supabase/functions/process-academy-task-queue/index.ts     new
src/components/admin/EcosystemSyncHealth.tsx               edit (4th row)
src/integrations/supabase/types.ts                         regenerated
.lovable/plan.md                                            replaced with this plan
```

### Rollback

`select cron.unschedule(<id>);` then `drop trigger trg_enqueue_academy_task_sync on public.challenge_evidence;`. Existing queue drains harmlessly; new approvals stop enqueuing.

### Next after this

P1 #4 per-tenant sync-health surface, or P1 #5 quest-chain bonus event.
