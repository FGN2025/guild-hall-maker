# Hide past tournaments + add archive system

## Why

The player Tournaments page currently shows tournaments whose `start_date` is in the past — they appear under the "Open" filter while you're registered, and "Past / Closed" exposes them too. You want past tournaments completely off the player-facing page, with a clean way to archive them (without nuking match history, registrations, or points already awarded).

The database currently has 32 tournaments with `start_date` before today still flagged `upcoming`/`open`/`completed`. They all need to be archived in a single sweep, and the system needs to keep auto-archiving as new tournaments age out.

## Approach

Reuse the soft-delete pattern we just built for the Prize Catalog: an `archived_at` flag on `tournaments` that hides them from the player view but preserves all history (registrations, brackets, points, achievements).

## Changes

### 1. Database
- Add `archived_at timestamptz NULL` column + index to `tournaments`.
- One-time data backfill: set `archived_at = now()` on every tournament where `start_date < now() - interval '7 days'` AND `archived_at IS NULL`. This sweeps the existing past tournaments older than 7 days. Tournaments inside the 7-day window stay visible for results/recap.

### 2. Player Tournaments page (`/tournaments`)
- Filter out archived tournaments at the query level in `useTournaments.ts` (`.is("archived_at", null)`).
- Remove the "Past / Closed" option from the status filter dropdown — the player view becomes upcoming/active only.
- "Registered" filter still works, scoped to non-archived tournaments.

### 3. Moderator Tournaments page (`/moderator/tournaments`)
- Add an "Archive" action on each tournament row alongside the existing actions.
- Add a "Show archived" toggle and an "Unarchive" action so mods can restore one if needed.
- Archived tournaments stay fully visible in moderator views (bracket, manage, results) — only the player-facing list filters them out.

### 4. Auto-archive going forward
- Schedule a daily `pg_cron` job that sets `archived_at = now()` on any non-archived tournament where `start_date < now() - interval '7 days'`.
- Result: a tournament stays on the player page for 7 days after its start date (so finished events get a brief recap window), then disappears automatically. Mods can still unarchive manually.

## Out of scope

- No changes to tournament registrations, bracket data, match results, points awarded, or Discord role logic.
- No changes to the tournament calendar export — it can decide separately whether to include archived events.
- No edits to `TournamentManage.tsx` or bracket pages — archived tournaments remain fully manageable for moderators.

## Technical notes

- Files touched: schema migration on `tournaments`, `src/hooks/useTournaments.ts`, `src/pages/Tournaments.tsx` (filter dropdown), `src/pages/moderator/ModeratorTournaments.tsx` (+ likely `useTournamentManagement.ts`), and a `pg_cron` schedule entry inserted via the data tool (not the migration tool, per project conventions).
- Backfill runs in the same schema migration as a single `UPDATE` so all qualifying past tournaments are archived the moment the migration applies.
