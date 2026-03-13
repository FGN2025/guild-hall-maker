

## Plan: Convert Achievements Page to Personal Trophy Room

### What Changes

1. **Sidebar label** (`src/components/AppSidebar.tsx`): Rename "Badges" to "Achievements" on line 58.

2. **Rewrite `src/pages/Achievements.tsx`**: Replace the global leaderboard with the logged-in player's personal achievement view.
   - Use `useAuth()` to get the current user's ID.
   - Use the existing `usePlayerAchievements(userId)` hook to fetch their achievements.
   - Reuse the existing `PlayerAchievements` component (already renders milestone cards, progress bars, special recognition section, tier styling).
   - Add a summary header showing unlocked count, progress bar, and tier breakdown.
   - Keep the sticky header, `PageHero`, and `PageBackground`.
   - Show a message prompting login if no user session (shouldn't happen since it's behind `ProtectedRoute`, but defensive).

### Structure of the New Page

```
Sticky Header:
  PageHero
  "My Achievements" title + unlocked X/Y summary

Body:
  <PlayerAchievements achievements={data} />
```

### Files Modified
- `src/components/AppSidebar.tsx` — rename label
- `src/pages/Achievements.tsx` — full rewrite to personal trophy room

No database changes, no new components needed. The existing `PlayerAchievements` component and `usePlayerAchievements` hook already handle all the rendering and data fetching logic.

