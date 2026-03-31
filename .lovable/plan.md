

## Leaderboard: 4 Changes — All-Time Ranking, Challenges Column, Game Filter, Tier Badges

### Change 1 — Fix All-Time Leaderboard Ranking (useLeaderboard.ts)

Rewrite `useLeaderboard` query to be points-based from `season_scores` instead of match-based:

- Query ALL rows from `season_scores`, group by `user_id`, sum `points`, `wins`, `losses`, `tournaments_played`
- Sort by total points desc, wins desc as tiebreaker
- Join `profiles_public` for display info
- Remove the match_results-based approach entirely (the existing game/tournament/time filters on the All-Time tab can be simplified or removed since the data source changes — keep the filters but they become no-ops or are removed)
- The `LeaderboardPlayer` interface adds `challenges_completed` and `tier` fields

The existing All-Time filters (game, tournament, time period) are no longer meaningful since we're aggregating season_scores. Remove the filter bar from the All-Time tab to avoid confusion.

### Change 2 — Add "Challenges" Column (both hooks + Leaderboard.tsx)

**Data fetch**: In both `useLeaderboard` and `useSeasonalLeaderboard`, after gathering user IDs, query `challenge_enrollments` where `status = 'completed'`, group by `user_id`, count per player.

For Seasonal: use all-time count as fallback (simpler, avoids complex date-range joins on challenge_enrollments which lacks a direct season_id).

**UI**: Add a "Challenges" column between Points and Wins in both Seasonal and All-Time table headers and rows. Update grid from `grid-cols-12` layout to accommodate 7 columns (Rank 1, Player 3, Tier 2, Points 1, Challenges 1, Wins 1, Matches 1 → use `grid-cols-14` or adjust spans).

### Change 4 — Game Filter on Seasonal Tab

- Add a new query hook `useActiveGames` that fetches from `games` where `is_active = true`, ordered by `display_order asc`
- Add a game filter `Select` dropdown in the seasonal filter bar, positioned after the Season dropdown
- State: `seasonalGameFilter` defaulting to `"all"`
- Filter logic: when a game is selected, query `challenge_enrollments` (status = completed) joined to `challenges` on `challenge_id` where `challenges.game_id = selectedGameId` to get the set of qualifying user_ids. Filter `filteredSeasonalPlayers` to only include those user_ids.
- Points/Wins/Challenges values remain unfiltered (full-season totals)

### Change 5 — Fix Tier Badges from Challenge Completions

Replace the percentile-based tier calculation with challenge-name-derived tiers:

- In both hooks, after getting user IDs, query `challenge_enrollments` (status = completed) joined to `challenges` to get challenge names per user
- For each user, scan their completed challenge names for keywords: Champion, Epic, Platinum, Gold, Silver, Bronze (in priority order)
- Assign the highest-priority match as their tier
- Default to `"unranked"` if no match

Update `TierBadge` component and `tierConfig` in Leaderboard.tsx:
- Add entries for `champion`, `epic`, `unranked`
- Update colors per spec (champion=gold #F59E0B, epic=purple #8B5CF6, platinum=cyan #06B6D4, gold=yellow #EAB308, silver=slate #94A3B8, bronze=orange #D97706, unranked=gray #6B7280)
- `TierBadge` should always render (show "Unranked" instead of returning null)

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useLeaderboard.ts` | Rewrite to aggregate `season_scores` by points; add challenges count + tier from challenge names |
| `src/hooks/useSeasonalLeaderboard.ts` | Add challenges count + challenge-name-derived tier to `SeasonalPlayer` |
| `src/pages/Leaderboard.tsx` | Update tierConfig, add Challenges column to both tabs, add game filter to Seasonal tab, remove All-Time filter bar, adjust grid layouts |

### Technical Notes

- Both `LeaderboardPlayer` and `SeasonalPlayer` interfaces get `challenges_completed: number` and updated `tier` field
- Challenge tier derivation query: `challenge_enrollments` inner join `challenges` where enrollment `status = 'completed'`, select `challenges.name` and `user_id`
- The `(supabase.from as any)` pattern is used for `profiles_public` (view); standard `.from()` for `challenge_enrollments` and `challenges`
- Grid column layout changes from 12-col to 14-col to fit the new Challenges column

