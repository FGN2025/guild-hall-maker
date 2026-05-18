# P1 #5 — Quest-Chain Bonus Event (`quest_chain.completed`)

Emit a dedicated `quest_chain.completed` event to Academy when a player finishes every quest in a chain. Today only per-quest completions stream; chain-level mastery and the bonus award are invisible to Academy, blocking pillar-level credit and next-step training recommendations.

## How it fires

`trg_quest_xp_on_completion` already inserts into `public.quest_chain_completions` exactly once per (user, chain). That insert is our atomic completion signal — no recomputation, no race.

```text
quest_completions INSERT
        │
        ▼
trg_quest_xp_on_completion (existing)
        │ writes once per chain
        ▼
quest_chain_completions INSERT
        │
        ▼
trg_enqueue_academy_chain_sync  ◄── new
        │
        ▼
pgmq.q_academy_chain_sync
        │ every 2 min
        ▼
process-academy-chain-queue (edge fn, new)
        │ reads chain + user_email + tenant_id
        ▼
ecosystem-webhook-dispatch
   event_type: 'quest_chain.completed'
   delivery_id: 'quest_chain:<user_id>:<chain_id>'
```

## Scope

### Database (migration)
- Add to `quest_chain_completions`:
  - `academy_synced boolean default false`
  - `academy_synced_at timestamptz`
  - `academy_sync_note text`
  - `academy_sync_attempts int default 0`
- `enqueue_academy_chain_sync(_user_id uuid, _chain_id uuid)` — pgmq send, auto-creates `academy_chain_sync` queue on first call (same pattern as task/quest enqueue functions).
- `trg_enqueue_academy_chain_sync` AFTER INSERT on `quest_chain_completions` → enqueues when `academy_synced` is false.
- Extend `get_academy_queue_stats()` with `chain_pending`, `chain_dlq`, `chain_oldest_age_seconds`.
- No backfill (per decision).

### Edge functions
- **`sync-quest-chain-to-academy`** — given `(user_id, chain_id)`: loads chain (name, pillar/tag, `bonus_points` awarded), user email, tenant_id, completion timestamp, and the list of quests in the chain. Calls `ecosystem-webhook-dispatch` with:
  ```
  event_type: 'quest_chain.completed'
  payload: {
    user_email, chain_id, chain_title, pillar,
    bonus_points_awarded, quests_completed: [...],
    completed_at,
    metadata: { delivery_id: 'quest_chain:<user_id>:<chain_id>', tenant_id }
  }
  tenant_id  // top-level, for ecosystem_sync_log.tenant_id
  ```
- **`process-academy-chain-queue`** — batch 25, 3 retries → DLQ. Marks `academy_synced = true` on success, increments `academy_sync_attempts` on failure, writes `academy_sync_note` with last error.

### Schedule
- `pg_cron`: `process-academy-chain-queue-every-2min` (insert via `supabase--insert`, mirroring the existing per-2-min task worker).

### Admin UI
- `EcosystemSyncHealth.tsx`: add 5th row "Quest chains" (pending / DLQ / oldest age) reading the new fields from `get_academy_queue_stats()`.

### Tenant UI
- `TenantSyncHealth.tsx`: zero changes — auto-picks up `webhook:quest_chain.completed` rows once `tenant_id` is set on dispatch logs.

## Out of scope
- Backfill of historical chain completions (decision: skip).
- Per-quest payload deduplication (handled by existing P1 #2 stream).
- Academy receiver changes — payload follows same envelope/HMAC contract as the other four streams.

## Rollback
```sql
select cron.unschedule('process-academy-chain-queue-every-2min');
drop trigger trg_enqueue_academy_chain_sync on public.quest_chain_completions;
drop function public.enqueue_academy_chain_sync(uuid, uuid);
-- optional: drop the 4 academy_* columns from quest_chain_completions
```
Plus restore previous `get_academy_queue_stats()` body.

## Files
- New migration: trigger, enqueue fn, columns, updated `get_academy_queue_stats()`.
- New `supabase/functions/sync-quest-chain-to-academy/index.ts`.
- New `supabase/functions/process-academy-chain-queue/index.ts`.
- Edit `src/components/admin/EcosystemSyncHealth.tsx` (add 5th row).
- Edit `.lovable/plan.md` (mark P1 #5 shipped on completion).
- `supabase--insert` call for `cron.schedule(...)`.
