## Current state (verified)

- `points_participation_long` / `points_participation_short` exist on `tournaments` (migration 20260729150845) and are written by the create/edit dialogs.
- Nothing reads them. The only participation payout is in the `award-tournament-placements` edge function, which reads `points_participation` and pays every registration with `attended = true`, inserting a `match_point_awards` row with `kind = 'participation'` and crediting `season_scores`.
- So for a Game Night, the long/short values are stored but never reach any player's balance.

## What to build

### 1. Record the tier per attendee
Add `participation_tier` (text, nullable, values `long` / `short`) to `tournament_registrations`. Null means "use the standard `points_participation`" so non-Game-Night events are unaffected.

### 2. Bulk assign in the manage page
In `src/pages/TournamentManage.tsx`, when the tournament format is `game_night`:
- Add a checkbox column to select multiple registrations.
- Add two buttons: **Mark Long** and **Mark Short**, which set `participation_tier` on all selected rows.
- Show the current tier as a badge next to each player.
- Keep the existing Attended checkbox as the gate for payout; a tier without attendance pays nothing.

### 3. Pay the right amount
Update `supabase/functions/award-tournament-placements/index.ts`:
- Select the two new columns and each attendee's `participation_tier`.
- For `game_night` format: pay `points_participation_long` or `points_participation_short` based on the tier; if tier is null, fall back to `points_participation`.
- All other formats keep today's behavior exactly.
- Keep the existing idempotency (unique `match_point_awards` on `kind = 'participation'`) so re-running never double-pays.

### 4. Make the payout visible before committing
The manage page already runs a dry-run path; extend the dry-run response to include the participation breakdown (count and total points per tier) so the admin sees what will be awarded before confirming.

## Scope notes

- Applies going forward only — no backfill of completed Game Nights. If a past one needs points, it can be assigned tiers and re-run manually, and idempotency means only the missing awards land.
- No change to `reconcile-tournament-points` semantics beyond the same tier-aware lookup, so the reconciler and the live awarder agree.

## Technical details

- Migration: `ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS participation_tier text` plus a validation trigger restricting values to `long` / `short` / null (trigger rather than CHECK, per project convention). Existing RLS and grants on the table already cover the column.
- Bulk update from the client uses `.update(...).in("id", ids).select("id")` so RLS-filtered no-ops surface as an error rather than a silent success — the same pattern used for the scheduled-post approve fix.
- Types regenerate after the migration; the edge function and manage page changes land afterward.
