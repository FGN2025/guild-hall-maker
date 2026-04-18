
The user wants to defer the push-to-academy automation. So I'll drop the trigger/backfill work and focus on the remaining gaps from the prior audit + what's needed to make the pull-based model reliable.

Reviewing what we know:
- Academy pulls from `ecosystem-data-api` (now working for tournaments after the fix)
- `sync-to-academy` exists but is only manually invoked from AdminChallenges — user says that's fine for now
- Outstanding issues identified earlier:
  1. `simu-cdl` listed as webhook target but NOT in magic-link whitelist (UI mismatch)
  2. API key permanently masked — no reveal/rotate UX
  3. No sync health visibility in the Ecosystem tab
  4. Achievement push gap — user is deferring this
  5. Need to confirm Academy can actually reach all the data it needs (achievements, completions, player progress) via the current pull endpoints

Let me also think about what the Academy needs to consume to issue/track work orders:
- challenges list (template) ✓ working
- challenge completions (who finished what) — need to verify endpoint exists
- player_achievements (badge data) — need to verify endpoint exists
- season_stats / player_progress — endpoints exist per earlier test

I should propose a focused, scoped plan. Keep it tight.

Plan structure:
1. Fix UI/data inconsistencies (simu-cdl mismatch)
2. Verify & document the pull-side completeness (challenge completions endpoint)
3. Add visibility (sync health card)
4. Improve API key UX (reveal for super-admin, rotate)
5. Document the Academy integration contract

No code changes in this turn — present plan for approval.
