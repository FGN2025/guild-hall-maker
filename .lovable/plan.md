## P1 #6 — Skill Passport refresh hook (SHIPPED)

After any successful Academy sync (achievement / quest / quest-chain / challenge / challenge-task), the player is queued for a debounced `passport.refresh_requested` event so Academy can recompute the Skill Passport within minutes.

### What shipped
- **Schema**: `public.passport_refresh_pending (user_id pk, requested_at, last_sent_at, last_sent_note, attempts)` + helper `enqueue_passport_refresh(user_id)`.
- **Workers updated**: `sync-to-academy`, `sync-achievement-to-academy`, `sync-quest-to-academy`, `sync-quest-chain-to-academy`, `sync-challenge-task-to-academy` all call `enqueue_passport_refresh(user_id)` on success.
- **New worker**: `process-passport-refresh-queue` — selects rows where `last_sent_at IS NULL OR last_sent_at < now() - 5min`, dispatches `passport.refresh_requested` via `ecosystem-webhook-dispatch` with delivery id `passport_refresh:<user>:<5min-bucket>`, then stamps `last_sent_at`.
- **Cron**: `process-passport-refresh-queue-every-2min`.
- **Stats**: `get_academy_queue_stats()` now returns `passport_pending`, `passport_oldest_age_seconds`. Admin `EcosystemSyncHealth` shows a 6th "Passport refreshes" row.

### Rollback
```sql
select cron.unschedule('process-passport-refresh-queue-every-2min');
drop function public.enqueue_passport_refresh(uuid);
drop table public.passport_refresh_pending;
```

### Next
P1 #7 — Per-tenant DLQ replay UI (Replay button on `TenantSyncHealth` for achievement / quest / task / chain DLQ rows).
