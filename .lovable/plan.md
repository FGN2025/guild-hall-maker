# Approve all 17 drafts, then lock the default to draft

All 17 scheduled posts currently sit in `pending_review`, spanning tonight 22:45Z through 28 August. Darcy's verdict: they all pass. This plan flips them to the dispatchable state, watches the first real publish, then applies the pending default-to-draft migration.

## Step 1 — Approve all 17

Write `status = 'pending'` (the exact value the dispatcher selects on) to every row currently in `pending_review`, scoped to those rows only. This is the same field and value the human "Approve" button writes in `useDraftDecision.ts`, so no new code path is introduced.

Scope guard: the update is keyed on `status = 'pending_review'` for the Acme tenant's rows only — no unscoped writes, no other columns touched.

Then re-read all 17 rows and report status, scheduled time, platform, and whether each has an `image_path` + linked `asset_id` so nothing dispatches with a rotted image.

## Step 2 — Watch the 22:45Z publish

The Mario Kart post fires first. After the window, read back:
- final status, `published_at`, `post_url` (real Facebook post id on page 108876075355045)
- any `error_message`
- the dispatcher's function logs for that invocation

If it fails, report the failure and stop — do not apply the migration.

## Step 3 — Apply the default-to-draft migration

Once a real post id is confirmed, run `docs/migrations-pending/2026-08-11-scheduled-posts-default-draft.sql`:

```sql
ALTER TABLE public.scheduled_posts ALTER COLUMN status SET DEFAULT 'draft';
```

Then confirm the column default reads `draft`, and confirm the 16 remaining approved posts still read `pending` (the default change must not touch existing rows).

## Notes and risks

- Approving all 17 means every one publishes automatically at its scheduled time with no further human gate. That is the intent, but it is worth stating plainly.
- One post (the original 20:00Z window) already has `overdue_notified_at` stamped; the overdue notice will not re-fire, publishing itself is unaffected.
- The approval ceiling is unaffected: these are human-authored approvals, which the trigger permits. Agent-authored writes to `pending` still get refused.
- No frontend changes in this plan.
