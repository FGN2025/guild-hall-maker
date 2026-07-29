# Pre-publish audit

Typecheck passes. Test suite: 3 failures (all in `src/test/data-shielding.test.tsx`). Below is what I verified by reading code/running checks, and what I propose to fix.

## Confirmed issues

**1. TournamentCard can crash on missing status (test suite failing)**
`TournamentCard` calls `t.effective_status.replace(...)` and `t.format.replace(...)` with no guard. The three failing tests crash with `Cannot read properties of undefined (reading 'replace')`. The live list hook always sets `effective_status`, so this is currently only a fragility + red test suite, not a confirmed production crash.
Fix: null-safe fallbacks in the card, and update the test fixtures to include the field.

**2. Tournament game picker ignores the new `supports_tournaments` flag**
Quests (`CreateQuestDialog`, `EditQuestDialog`), challenges (`Create/EditChallengeDialog`) and tenant events all filter games by their support flag. `CreateTournamentDialog` and `EditTournamentDialog` still render `games.map(...)` unfiltered — so tournament creation offers games explicitly tagged as not supporting tournaments.
Fix: filter to `supports_tournaments`, grandfathering the currently-selected game with the "(no longer supported)" hint, matching the challenge/quest pattern.

**3. Difficulty selector on tournaments is a dead control**
Both tournament dialogs render a Difficulty dropdown, but it is never included in the create/update payload, and `difficulty` exists only on `challenges` and `quests` in the schema — there is no `tournaments.difficulty` column. Users set it and it silently vanishes.
Fix: remove the control from both tournament dialogs (safer than adding an unused column). Say the word if you'd rather have a real column instead.

**4. Undo can revoke more than it awarded**
In `award-tournament-placements`, the revoke branch deletes **every** `match_point_awards` row for that user in the tournament — including per-match points awarded by bracket results — not just the participation award created from the Manage dropdown, and debits the full sum from the season score.
Fix: scope the revoke delete to `kind = 'participation'` rows (the ones the dropdown creates), leaving match-derived awards intact.

**5. Placement revoke leaves `attended = true`**
Awarding a placement sets `tournament_registrations.attended = true`; the undo path clears `participation_tier` (Game Night only) but never resets `attended`, so a fully-undone player still counts as attended.
Fix: reset `attended = false` on revoke when no awards remain for that player.

## Checked and clean
- Placement point derivation (prize-pool percentage fallback) is now identical in the edge function and the Manage page: saved value wins, else `round(pool * pct/100)` when `prize_type === 'value'`; both parse the pool the same way.
- Duplicate awards are guarded (23505 → 409) for both placements and participation.
- Season/points writes go to `season_scores` (points + points_available), which is what the leaderboard and wallet read — consistent both on credit and debit, with a floor of 0.
- Console log snapshot shows only harmless preview-harness warnings.

## Technical notes
Files to change: `src/components/tournaments/TournamentCard.tsx`, `src/components/tournaments/CreateTournamentDialog.tsx`, `src/components/tournaments/EditTournamentDialog.tsx`, `src/test/data-shielding.test.tsx`, `supabase/functions/award-tournament-placements/index.ts` (redeploy required). No schema migration needed. After the changes I'll re-run typecheck and the test suite.
