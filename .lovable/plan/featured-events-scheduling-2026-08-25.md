# Featured Events Scheduling

Add `featured_start_at` / `featured_end_at` windows to featured items so they auto-publish and expire on the homepage, using a **read-time window filter** (no cron). A start date is **required** for anything featured.

## How it behaves

- `is_featured` stays the master switch. The window bounds when it actually shows.
- An item appears on the homepage only when `is_featured = true` AND `now() >= featured_start_at` AND (`featured_end_at` is null OR `now() < featured_end_at`).
- Expiring never clears the featured flag — extend the window and it comes back.
- Featuring always requires a start date (defaults to "now", editable). End date is optional (blank = never expires).

## Steps

### 1. Database migration

One migration via the migration tool:

- `ALTER TABLE tournaments / challenges / quests ADD COLUMN featured_start_at timestamptz, ADD COLUMN featured_end_at timestamptz;`
- Backfill existing featured rows: `SET featured_start_at = now() WHERE is_featured = true AND featured_start_at IS NULL` (so nothing currently live disappears).
- Immutable CHECK constraints:
  - `featured_end_at IS NULL OR featured_start_at IS NULL OR featured_end_at > featured_start_at`
  - `NOT (is_featured AND featured_start_at IS NULL)` — enforces "start required" at the data layer.
- No GRANT/policy changes needed (column add on existing tables; anon/authenticated reads unaffected).
- Regenerate `src/integrations/supabase/types.ts` after the migration applies (auto-gen, not hand-edited).

### 2. Homepage reader — `src/components/FeaturedEvents.tsx`

- Select the two new columns for all three types.
- Client-side filter after fetch: `is_featured && now >= start && (!end || now < end)`.
- Featured sets are small, so in-memory filtering keeps the query simple and anon-safe.

### 3. Managed-pages preview — `src/components/webpages/FeaturedEventsPreview.tsx`

- Apply the same window filter so previews match the live homepage.

### 4. Manage UI — `src/pages/moderator/ModeratorFeaturedEvents.tsx`

- Picker "Feature" button now opens a small schedule dialog: **start** (datetime-local, required, defaults to now) and **end** (optional). Save writes `is_featured = true` + window in one update.
- Featured cards show the window ("Aug 25 → Sep 1" or "from Aug 25, no end") plus a status badge: **Scheduled** (future start), **Live** (in window), **Expired** (past end, dimmed).
- Per-card "Edit schedule" action to change/clear the window; "Remove" still un-features (and clears the window columns).
- Header counter distinguishes live vs scheduled vs expired.

### 5. Quick star toggles — `AdminTournaments.tsx`, `AdminChallenges.tsx`, `AdminQuestsPanel.tsx`

- When starring ON: write `is_featured = true, featured_start_at: now(), featured_end_at: null` (satisfies the start-date constraint without a dialog).
- When starring OFF: write `is_featured = false` and clear both window columns.

### 6. Verification

- Build/typecheck passes.
- Feature an item with a future start → confirm it does NOT appear on the homepage but shows as "Scheduled" in Manage; switch start to now → appears as "Live"; set end in the past → drops off homepage and shows "Expired".

## Technical details

- No edge functions, no pg_cron — expiry is evaluated at read time.
- CHECK constraints are immutable (row-local comparisons only), per project constraint rules.
- Backfill uses a plain UPDATE; no ON CONFLICT applies here (schema + backfill, no insert conflicts).
- RLS: window filtering is presentation logic, not access control — anon read policies are unchanged.
