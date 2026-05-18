## P1 #2 — Quest Completion Sync

Mirror the achievement-sync pattern for `quest_completions` so that finishing a quest (or a quest-chain) reliably reaches FGN Academy through the HMAC-signed `ecosystem-webhook-dispatch`, with the same retry/DLQ guarantees the challenge and achievement queues already have.

### Scope

1. **Schema** — add to `quest_completions`:
   - `academy_synced boolean default false`
   - `academy_synced_at timestamptz`
   - `academy_sync_note text`
   - `academy_sync_attempts integer default 0`

2. **Queues** (`pgmq`) — `academy_quest_sync` + `academy_quest_sync_dlq`.

3. **DB plumbing**
   - `enqueue_academy_quest_sync(_user_id, _quest_id)` SECURITY DEFINER.
   - `trg_enqueue_academy_quest_sync` AFTER INSERT on `quest_completions` (skips when `academy_synced` already true — supports moderator backfills).
   - Extend `get_academy_queue_stats()` to also return `quest_pending`, `quest_dlq`, `quest_oldest_age_seconds`.

4. **Edge functions** (verify_jwt = false, service-role auth gate, stateless admin client):
   - `sync-quest-to-academy` — resolves email, quest definition (incl. `chain_id`, xp/points reward), tenant, profile; dispatches `quest.completed` event. Stable `delivery_id = "quest:<user_id>:<quest_id>"`. Soft-success on "no active webhook target". Marks the row via `markRow` helper just like achievements.
   - `process-academy-quest-queue` — batch 25, VT 120s, max 3 attempts → DLQ. Idempotency: skip if `quest_completions.academy_synced = true`. Bumps `academy_sync_attempts`.

5. **Cron** (via `supabase--insert`, not migration — contains anon key) — schedule `process-academy-quest-queue` every 2 minutes.

6. **Admin UI** — extend `src/components/admin/EcosystemSyncHealth.tsx` Retry Queue card with a third row "Quest completions" (pending / DLQ / oldest age), reusing the existing grid layout.

### Out of scope
- Quest-chain bonus event (`quest_chain.completed`) — fold into a follow-up if Academy wants chain-level credit.
- Task-level streaming (P1 #3).
- Backfill function (volume is low; can be added if drift appears).

### Technical notes

**Event payload** (`event_type: "quest.completed"`):
```json
{
  "user_email": "...",
  "external_user_id": "...",
  "quest": { "id", "name", "description", "xp_reward", "points_reward", "chain_id" },
  "completed_at": "...",
  "awarded_points": 0,
  "metadata": { "source": "play.fgn.gg", "delivery_id", "external_attempt_id",
                "tenant_id", "tenant_slug", "tenant_name", "display_name" }
}
```

**Files**
- `supabase/migrations/<ts>_quest_academy_sync_queue.sql` — column add, queue create, function, trigger, stats extension.
- `supabase/functions/sync-quest-to-academy/index.ts` — new.
- `supabase/functions/process-academy-quest-queue/index.ts` — new.
- `src/components/admin/EcosystemSyncHealth.tsx` — third queue row.
- `src/integrations/supabase/types.ts` — regenerated post-migration.

**Rollback:** `select cron.unschedule(<id>);` then `drop trigger trg_enqueue_academy_quest_sync on public.quest_completions;` — trigger removal stops enqueue; existing queue drains and dies harmlessly.

**Next after this:** P1 #3 task-level streaming, or P1 #4 per-tenant sync-health surface.
