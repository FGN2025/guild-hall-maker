# Preserve the Play ↔ Academy challenge & achievement sync

## Goal
Confirm and guard the existing shared-data connection between Play and the Academy ecosystem so the Merit Pathways move (and future changes) never break it.

## Current state (verified just now)
- The shared data connection serves all of these actions: `challenges`, `achievements`, `player-progress`, `games`, `tournaments`, `tenant-events`, `season-stats`, and the legacy `quests` (the old quests table still exists, so that action still works).
- Pushed events are live: three active subscriptions send `challenge.created`, `challenge.updated`, `challenge.deactivated` to the Merits receiver (verified working end-to-end earlier), plus the Academy `challenge_completion` subscription.
- None of these reference the merit tables or merit UI — the Merit Pathways removal touched only pages, navigation, and one hook, so the connection is already preserved. No repair is needed.

## What this plan adds
1. **Extend the admin "Test Connection" button** (Admin → Ecosystem) with two new checks so the sync is continuously verifiable in one click:
   - a signed pull of the `challenges` action (expects a data list back)
   - a signed pull of the `achievements` action (expects a data list back)
   - keep all six existing checks unchanged
2. **Contract note in `docs/merit-connector.openapi.yaml`** (or a short ecosystem README section) stating these actions and events are the standing Play↔Academy contract and must not be removed or renamed without coordinating with the Academy/Merits projects.
3. **Re-run the extended Test Connection** and report which checks pass.

## What this plan does NOT change
- No changes to the data connection's actions, the event dispatcher, webhook subscriptions, or signing secrets.
- No changes to challenges, achievements, or merit data — merit tables stay in place until Merits confirms its import.
- No UI changes beyond the two extra rows in the existing admin test panel.

## Technical details
- Files: `supabase/functions/ecosystem-connection-test/index.ts` (add two checks), `src/components/admin/EcosystemConnectionTest.tsx` (display them), `docs/merit-connector.openapi.yaml` (contract note).
- The new checks call the existing data endpoint with the shared key, exactly as the current health/catalogue checks do.
