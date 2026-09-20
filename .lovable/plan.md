# Games page — show all games, flag live challenges

The games page keeps its purpose as a full library: **every active game stays listed**. On top of that, each game card gets a clear indicator when that game has a challenge running right now, and visitors get an optional filter to narrow the list to those games.

## Changes

1. **Challenge indicator on every game card**
   - One lightweight query on the games page fetches active challenges (`is_active = true`, current date within `start_date`–`end_date` when those are set) and builds a set of game IDs/names.
   - `GameCard` shows a small "Live Challenge" badge (cyan, top corner of the cover art) when the game is in that set. No badge otherwise — no "coming soon" or empty-state messaging.

2. **"Has Challenges" filter**
   - A checkbox next to the existing "Has Tournaments" one. Ticking it narrows the grid to games with a live challenge; unticked (default) shows the full library.
   - Results count text stays as-is ("N games found").

3. **Nothing hidden, nothing removed**
   - No games are removed from the page. The earlier idea of hiding games without challenges is dropped.

## Technical notes

- `src/pages/Games.tsx`: add a `useQuery` on `challenges` selecting `game_id, games(name)` where `is_active = true` and (`start_date` null or `<= now`) and (`end_date` null or `>= now`); build a `Set` of names; pass a `hasLiveChallenge` boolean into each `GameCard`; add the checkbox state + filter condition.
- `src/components/games/GameCard.tsx`: accept optional `hasLiveChallenge` prop and render the badge; no other card changes.
- Date-window check matches the challenge detail page's own fields (`start_date`/`end_date`); scheduled-window challenges (`tenant_challenge_schedules`) are out of scope for the badge.

## Verification

- Type-check passes.
- Playwright pass on `/games`: all games render, games with a live challenge show the badge, ticking "Has Challenges" filters correctly, unticking restores the full list.
