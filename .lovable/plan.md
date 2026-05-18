## P1 #5 — Quest-Chain Bonus Event (SHIPPED)

`quest_chain.completed` now streams to Academy on every chain finish, giving pillar-level credit and unblocking next-step training recommendations.

### What shipped
- **Schema**: `quest_chain_completions` gained `academy_synced`, `academy_synced_at`, `academy_sync_note`, `academy_sync_attempts`.
- **Trigger**: `trg_enqueue_academy_chain_sync` AFTER INSERT on `quest_chain_completions` → `pgmq.q_academy_chain_sync` (+ DLQ).
- **Edge fns**: `sync-quest-chain-to-academy` (single completion, stable `delivery_id = quest_chain:<user>:<chain>`) and `process-academy-chain-queue` (batch 25, 3 retries → DLQ).
- **Cron**: `process-academy-chain-queue-every-2min`.
- **Stats**: `get_academy_queue_stats()` extended with `chain_pending`, `chain_dlq`, `chain_oldest_age_seconds`. Admin `EcosystemSyncHealth` shows a 5th "Quest chains" row.
- **Tenant UI**: no change — auto-picks up `webhook:quest_chain.completed` rows via existing `tenant_id` plumbing.

### Rollback
```sql
select cron.unschedule('process-academy-chain-queue-every-2min');
drop trigger trg_enqueue_academy_chain_sync on public.quest_chain_completions;
drop function public.enqueue_academy_chain_sync(uuid, uuid);
```

### Next
P1 #6 (TBD) — pick from remaining backlog (likely passport refresh or per-tenant DLQ replay UI).
