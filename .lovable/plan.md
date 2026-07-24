
# Marketing pipeline notifications — revised for execution

Approved with four flags folded in. Flag 4 is the prerequisite and runs first.

## Flag 4 (PREREQUISITE) — verify & fix the dispatcher cron

Before building any notification trigger, prove `publish-scheduled-posts` is actually being invoked.

Steps in this order, all inside the same execution pass:

1. Query `cron.job` for jobs whose command references `publish-scheduled-posts` or `publish_scheduled_posts`. Record `jobname`, `schedule`, `command`, `active`.
2. Query `cron.job_run_details` for the last 20 runs of that job (or confirm zero runs).
3. Pull `supabase--edge_function_logs` for `publish-scheduled-posts` — the current 3-line log shows only ad-hoc invocations, no cron ticks, which matches the CRON BAIT TEST symptom.
4. If the job is missing or inactive, `supabase--insert` (NOT a migration — the SQL contains the service-role bearer per `<schedule-jobs-supabase-edge-functions>`) a new cron entry:
   - Name: `publish-scheduled-posts`
   - Schedule: `* * * * *` (every minute)
   - Command: `net.http_post` to `https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/publish-scheduled-posts` with `Authorization: Bearer <service_role>` (fetched from vault secret `email_queue_service_role_key` if present, otherwise a new vault secret `dispatcher_service_role_key`), empty JSON body.
5. Wait one tick, re-pull `cron.job_run_details` and edge function logs, paste one real tick into verification.
6. Confirm CRON BAIT TEST would have flipped (but we delete it in cleanup below before it can fire).

If the job already exists and is running but the CRON BAIT TEST row was never selected, the query filter is the culprit (`status='pending'` exact match — it *is* pending, so this shouldn't be it). Investigate whether the function was returning early on auth failure by re-checking the `Authorization` header the cron job sends vs. what the function expects (`Bearer ${serviceKey}`). Fix accordingly.

## Cleanup (same pass, after Flag 4 verified)

Via `supabase--insert` (DELETEs allowed on that tool):

- `scheduled_posts` where `tenant_id = <Acme>` and `caption ILIKE 'CRON BAIT TEST%'` OR the sibling row scheduled `2026-08-01`.
- `marketing_campaigns` where `tenant_id = <Acme>` and `title ILIKE 'TEST Agent Verification%'` OR `title ILIKE 'TEST Event Linkage%'`.
- `tenant_marketing_assets` linked to the two deleted test campaigns via `campaign_id`, plus any storage objects under those paths.

Run a SELECT first to preview ids, then DELETE and confirm zero rows remain.

## Flag 1 — campaign revisions notify

Add a second trigger path on `marketing_campaigns` UPDATE:

```
WHEN OLD.status = 'rejected'
  AND NEW.status = 'rejected'
  AND NEW.agent_source IS NOT NULL
  AND (
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.description IS DISTINCT FROM OLD.description OR
    NEW.social_copy IS DISTINCT FROM OLD.social_copy OR
    NEW.target_platforms IS DISTINCT FROM OLD.target_platforms OR
    NEW.source_event_id IS DISTINCT FROM OLD.source_event_id OR
    NEW.source_tournament_id IS DISTINCT FROM OLD.source_tournament_id
  )
```

→ fires `draft_resubmitted`. Scheduled posts keep the original `OLD.status='rejected' → NEW.status='pending_review'` trigger.

## Flag 2 — MCP tools return conflict data

`propose_scheduled_post` and `update_scheduled_post` extend their response payload:

```json
{
  "scheduled_post": { ...row },
  "conflict": {
    "flagged_at": "2026-07-24T14:00:00Z",
    "window_minutes": 60,
    "conflicts": [
      { "id": "uuid", "scheduled_at": "...", "platform": "...", "status": "..." }
    ]
  }
}
```

`conflict` is `null` when the helper returns no hits. Tool description updated to tell the agent to reschedule and retry when `conflict` is non-null. Notifications and UI badges still fire so humans see conflicts the agent didn't or couldn't resolve.

## Flag 3 — asset trigger keyed on is_published, not status

`tenant_marketing_assets` has no `status` column. Correct trigger:

```
AFTER INSERT ON tenant_marketing_assets
WHEN NEW.is_published = false AND NEW.agent_source IS NOT NULL
```

→ fires `draft_new`. No `draft_resubmitted` path for assets (they are recreated, not revised).

Note: `tenant_marketing_assets` currently has no `agent_source` column either. Migration adds it (`text null`, indexed). `attach_tenant_asset_draft` starts writing `agent_source = 'claude-mcp'`. Existing rows stay null and won't spam notifications.

## Everything else from the previous plan is unchanged

Sections 1 (data model), 2 (recipient resolution + orphaned_notifications), remaining triggers in section 3, dispatcher refactor in section 4 (widen query to include `pending_review` for overdue detection, undeliverable precheck for null/missing connection), section 5 conflict window, section 6 UI badges + new preferences, section 7 two email templates, all stand as previously approved.

## Files (updated)

- Cron insert via `supabase--insert` (not a migration).
- `supabase/migrations/<new>.sql` — notifications columns, `orphaned_notifications`, `marketing_notification_state`, `scheduled_posts.conflict_flagged_at/undeliverable_reason/overdue_notified_at/undeliverable_notified_at`, `tenant_marketing_assets.agent_source`, RLS/grants, `get_marketing_notification_recipients`, `enqueue_marketing_notification`, `check_schedule_conflict`, all triggers (including Flag 1 revision path and Flag 3 asset path).
- Cleanup DELETEs via `supabase--insert`.
- `supabase/functions/publish-scheduled-posts/index.ts` — widened query, prechecks, counts.
- `supabase/functions/_shared/transactional-email-templates/marketing-alert.tsx`, `marketing-draft-digest.tsx`, `registry.ts`.
- `src/lib/mcp/tools/propose-scheduled-post.ts`, `update-scheduled-post.ts`, `attach-tenant-asset-draft.ts` — Flag 2 response shape, agent_source on assets.
- `src/components/tenant/AgentDraftsPanel.tsx`, `src/components/marketing/ScheduledPostsCalendar.tsx` — conflict + undeliverable badges.
- `src/components/NotificationPreferences.tsx`, `src/hooks/useNotificationPreferences.ts` — three new categories.
- New admin surface for `orphaned_notifications`.

## Verification (extended)

1–8. As previously written.
9. Paste `cron.job` row (name, schedule, active) plus one `cron.job_run_details` row and one edge log line proving a real tick fired.
10. Revise a rejected `marketing_campaigns` row via `update_campaign_draft`, confirm `notifications` row with category `draft_resubmitted` appears for tenant admin.
11. Create two `propose_scheduled_post` calls 10 minutes apart on the same platform, confirm the second response includes `conflict.conflicts[0].id` equal to the first row.
12. `SELECT count(*)` on `scheduled_posts` / `marketing_campaigns` / `tenant_marketing_assets` filtered on the deleted test titles/captions returns 0.
