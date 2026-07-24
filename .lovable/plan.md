
# Phase 1 closeout: Marketing notification preferences UI

Close the item 4 partial fail by exposing the three approved marketing email toggles. In-app stays always on and is not rendered as a switch. Defaults all on (no rows = on, per existing hook fallback).

## Toggle → category mapping

Three UI toggles fan out to the six underlying dispatcher categories:

| Toggle key                  | Covers categories                                  |
| --------------------------- | -------------------------------------------------- |
| `marketing_drafts_digest`   | `draft_new`, `draft_resubmitted`                   |
| `marketing_errors`          | `dispatch_error`, `undeliverable`, `overdue`       |
| `marketing_conflicts`       | `schedule_conflict`                                |

## Changes

1. **`src/hooks/useNotificationPreferences.ts`** — append the three marketing entries to `NOTIFICATION_TYPES`. Tag them (e.g. `emailOnly: true`) so the UI knows to hide the in-app switch.

2. **`src/components/NotificationPreferences.tsx`** — render a dedicated "Marketing Pipeline" section (admins/managers/marketing role members will primarily use it, but shown to all — cheap, no leak). For `emailOnly` entries, render only the Email switch with a helper line clarifying that in-app cannot be disabled.

3. **New migration** — replace `get_marketing_notification_recipients` so email suppression checks the mapped parent toggle instead of the raw category:
   ```sql
   -- lookup key = CASE _category
   --   WHEN 'draft_new','draft_resubmitted' THEN 'marketing_drafts_digest'
   --   WHEN 'dispatch_error','undeliverable','overdue' THEN 'marketing_errors'
   --   WHEN 'schedule_conflict' THEN 'marketing_conflicts'
   --   ELSE _category
   -- END
   ```
   Function stays SECURITY DEFINER, same signature, same grants. `marketing` role still gets in-app only regardless of toggle.

## Verification

Executed against a test tenant admin user (report inline after build):

- **V1** No preference rows → `get_marketing_notification_recipients` returns `channels = {in_app,email}` for each of the six categories.
- **V2** Insert `notification_preferences` row `marketing_errors` with `email_enabled=false` → recipient function returns `channels = {in_app}` for `dispatch_error`, `undeliverable`, `overdue`; still `{in_app,email}` for the other three.
- **V3** Repeat for `marketing_drafts_digest` (verifies `draft_new` + `draft_resubmitted` suppress email, others unaffected).
- **V4** Repeat for `marketing_conflicts` (verifies `schedule_conflict` suppresses email, others unaffected).
- **V5** In-app row still inserted by `enqueue_marketing_notification` in all suppression cases (spot-check via a synthetic call in a transaction, rolled back).
- **V6** Marketing-role user always returns `channels = {in_app}` regardless of toggle state.

All six verifications executed via `supabase--read_query` / a scratch migration in a transaction; report pass/fail per line.

## Out of scope

- No changes to categories, triggers, dispatcher, or MCP tools.
- Item 2 and item 10 remain accepted as structural passes (live-fire from Claude side).
- Phase 2 kickoff begins only after this patch's verification report is accepted.
