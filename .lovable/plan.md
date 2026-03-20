

## Points Wallet Widget — Surface Across Key Pages

### What & Why
The points wallet (Available / Total Earned) is currently only visible on the Prize Shop page. Players earning points through challenges, quests, matches, and moderator awards have no visibility into their balance unless they navigate to the shop. Surfacing this widget on high-traffic pages reinforces the reward loop and drives engagement with the economy.

### Where to Add the Wallet

| Page | Rationale |
|------|-----------|
| **Dashboard** | First thing players see after login — shows their balance alongside other key stats |
| **Challenges** | Players earn points by completing challenges — seeing balance motivates participation |
| **Quests** | Same as Challenges — quest completions award points |
| **Leaderboard** | Players see rankings based on points — wallet contextualizes their own standing |
| **Player Profile** | Personal stats page — natural home for wallet balance |

### Implementation

**Step 1: Extract a reusable `PointsWalletCard` component**

Create `src/components/shared/PointsWalletCard.tsx` that encapsulates the wallet query and display logic currently inline in `PrizeShop.tsx`. It will:
- Accept an optional `compact` prop for smaller placements (sidebar, inline stats rows)
- Query `seasons` + `season_scores` to aggregate available/earned points (same logic as PrizeShop)
- Use a shared React Query key (`player-season-score`) so all instances stay in sync
- Include a "Go to Prize Shop" link in the non-compact variant
- Only render when the user is authenticated

**Step 2: Add the widget to each page**

- **Dashboard**: Add as a new stat card in the top stats row, alongside Tournaments/Matches/Wins/Win Rate
- **Challenges**: Add below the page header, above the filter/game tabs
- **Quests**: Add alongside the existing XP rank badge area
- **Leaderboard**: Add a small compact wallet card near the top when viewing the seasonal tab
- **Player Profile** (`PlayerProfile.tsx`): Add to the stats grid below the profile header (own profile only)

**Step 3: Refactor PrizeShop to use the shared component**

Replace the inline wallet markup in `PrizeShop.tsx` with the new `PointsWalletCard` component to eliminate duplication.

### Files to create/edit
- **New**: `src/components/shared/PointsWalletCard.tsx`
- **Edit**: `src/pages/Dashboard.tsx` — add wallet card
- **Edit**: `src/pages/Challenges.tsx` — add wallet card
- **Edit**: `src/pages/Quests.tsx` — add wallet card
- **Edit**: `src/pages/Leaderboard.tsx` — add compact wallet card
- **Edit**: `src/pages/PlayerProfile.tsx` — add wallet to own-profile view
- **Edit**: `src/pages/PrizeShop.tsx` — refactor to use shared component

No database or migration changes required.

