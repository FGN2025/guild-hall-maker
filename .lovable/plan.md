# Speed up Studio GET /sources (target under 2 s)

## Cause (confirmed by reading the handler)

`/sources` loads the game list (59 games), then for each game runs two more database calls one after another: a challenge count and a per-source revision lookup. That is about 118 sequential round-trips per request, which explains the ~24 s. `/challenges` uses a few batched queries, so it is fast despite a much bigger payload. Data size is small (128 challenges, 60 revision rows), so this is not a missing-index or cold-start problem.

## Fix

Replace the per-game loop with two batched reads, run in parallel:

1. One query for `challenges` (`game_id, is_active`) filtered to the page's game ids (and `is_active = true` when inactive visibility is off), counted in memory per game.
2. One query for `catalog_revisions` rows whose scope keys are `game:<id>` for the page's games, mapped in memory (missing = 0, same as today).

Response shape, ordering, cursor, revision and scope rules stay identical — no contract change.

Also add an index on `challenges(game_id)` as a cheap safeguard for growth.

## Verification

- Mint a temporary test credential, call `GET /sources?limit=200` several times, record timings (goal: under 2 s warm) and confirm items/counts/sourceVersion match a pre-change capture.
- Spot-check pagination (`limit=10` walk to exhaustion) still works.
- Delete the temp credential; update the verification report with the new timing.

## Technical detail

- File: `supabase/functions/studio-api/index.ts`, `/sources` branch only; redeploy `studio-api`.
- Migration: `CREATE INDEX IF NOT EXISTS challenges_game_id_idx ON public.challenges(game_id);`
