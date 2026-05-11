## Goal

Make every "points" number a player sees represent the same thing, sourced from the same query, with consistent labels and formatting. Selected policy: **lifetime wallet, lifetime total earned**.

## Source of truth

One shared hook reads `season_scores` for the user with **no season filter**:

- `pointsAvailable` = `sum(season_scores.points_available)` → spendable wallet (lifetime)
- `totalPointsEarned` = `sum(season_scores.points)` → career earned (lifetime)

After this change the same user should see, everywhere on the site:
- **Spendable: 473 pts**
- **Total Earned: 1043 pts**

The current 425 / 435 figures (active-season only) disappear from the UI.

## Changes

### 1. `src/components/shared/PointsWalletCard.tsx`
- Remove the `seasons.status='active'` filter from the `player-season-score` query so it sums across all seasons.
- Keep the same component shape (compact + full variants); only the data source changes.
- Result: every page that already uses `PointsWalletCard` (Dashboard, PrizeShop, Leaderboard, PlayerProfile, Quests, Challenges) becomes consistent automatically.

### 2. `src/pages/Dashboard.tsx`
- Remove the standalone `Total Earned` and `Spendable Points` tiles from the 8-tile grid (they duplicate what `PointsWalletCard` shows two rows below). New grid is 6 tiles: Registered Tournaments, Challenges Completed, Quests Completed, Win Rate, Matches Played, Matches Won — switch the grid to `lg:grid-cols-3` (or keep 4-col and let it wrap). This eliminates the 1043 vs 435 / 473 vs 425 conflict by having a **single** points surface on the page.
- `PointsWalletCard` directly under the stat grid remains the one place points are shown.

### 3. `src/hooks/useDashboard.ts`
- Drop `pointsQuery` and the `totalPointsEarned` / `pointsAvailable` fields from `DashboardStats` (no longer rendered).
- Saves one query per dashboard load.

### 4. Labeling/formatting consistency in `PointsWalletCard`
- Both numbers render with the same unit suffix (`pts`) and same mono font.
- Labels: **"Spendable"** (primary, large) and **"Lifetime Earned"** (secondary, muted) — "Lifetime" makes the scope explicit so it's never confused with season scores again.

## Out of scope
- No DB migration, no trigger changes, no edge functions.
- No change to redemption logic — `trg_deduct_points_on_approval` continues to deduct from `points_available`. Lifetime spendable already matches how the trigger works.
- Seasonal Leaderboard continues to read season-scoped data (different product surface, intentional).
- The 48-pt gap between lifetime spendable (473) and active-season spendable (425) becomes invisible to the player and is treated as legitimate carry-over — no backfill needed.

## Technical notes
- `season_scores` is per `(user_id, season_id)`. Summing across all rows gives the lifetime view directly; no new tables or views needed.
- React-query keys stay stable (`player-season-score`, user-scoped) so cache invalidation on point changes still works.
