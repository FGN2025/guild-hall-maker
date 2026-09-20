# Data hygiene clean-up (audit item 4)

Three leftovers from the audit: quarantined test notifications, very old notifications, and stored files nothing points at. Nothing is deleted until you have seen the list.

## What the live data shows right now

- **Quarantined notifications:** 60 rows, all from three test/verification broadcasts on 24 Jul and 23 Aug ("Verification: fanout ... Test only"). None are real member messages.
- **Old notifications:** 1,214 in total; 337 unread and 165 already read are older than 90 days. The oldest is from 26 Feb.
- **Stored files:** 240 files in the provider marketing store (461 MB) — 182 of them (353 MB) are not pointed at by any record. 402 files in the main media store (779 MB) — 183 (394 MB) likewise. These counts come from a first pass and may drop once page layouts are included (see below).

## Plan

### Step 1 — Remove the quarantined test notifications
Delete the 60 verification rows. They were never delivered to anyone and are test artefacts.

### Step 2 — Tidy old notifications
Add a scheduled nightly clean-up:
- Delete read notifications older than 90 days.
- Delete unread notifications older than 180 days.
- Everything newer is untouched.

Run it once now, then leave it running nightly so the list never builds up again.

### Step 3 — Unused files: produce the report only
Re-run the scan with the page-builder layouts included, then hand you a file per store listing every unreferenced file with its name, size and upload date, plus the totals. **No file is deleted in this pass.** You review the report and tell me what to remove; removal then happens through the storage service, one batch at a time, with the list saved first.

## Technical notes

- Quarantine rows live in `orphaned_notifications`; all 60 share three `related_id` values and the categories are fan-out verifications.
- Retention job: a `pg_cron` entry calling a `SECURITY DEFINER` function that deletes from `notifications` by `is_read` + `created_at`; the 21 existing cron jobs stay untouched.
- The unreferenced-file scan compares `storage.objects.name` against every URL/path column plus the JSON layout columns (`web_page_sections.config`, `web_page_templates.sections`, `tenant_saved_blocks.config`, `tenant_marketing_assets.overlay_config`) and a repository text search, so files used only inside a page layout are not mistaken for orphans.
- Storage rows are never deleted with SQL; removal goes through the storage API only.
- The report is written to Files as CSV, one per store.
