

## Item 10: Add Loading Skeletons to Key Pages

### Current State
- **Tournaments page**: Already has proper skeleton loading (card-shaped placeholders with staggered animation). No changes needed.
- **Leaderboard page**: Already imports and uses `TableSkeleton`. No changes needed.
- **Dashboard page**: Uses a generic spinner (`animate-spin` border circle) instead of content-shaped skeletons.
- **Games page**: Uses a generic `Loader2` spinner instead of content-shaped skeletons.
- **Challenges, Community, Achievements** pages: Likely also use spinners (will verify during implementation).

### Plan

**1. Dashboard (`src/pages/Dashboard.tsx`)**
Replace the spinner with skeleton cards matching the 4-stat grid layout, plus skeleton blocks for the "My Tournaments" and "Recent Matches" panels.

**2. Games (`src/pages/Games.tsx`)**
Replace the `Loader2` spinner with a grid of skeleton game cards (matching the `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5` layout), each with a cover image placeholder and title line.

**3. Audit remaining pages**
Check Challenges, Community, Achievements, and PlayerProfile for spinner-only loading and replace with content-shaped skeletons where impactful.

### Technical Approach
- Use the existing `Skeleton` component from `src/components/ui/skeleton.tsx`
- Match skeleton shapes to actual content layout (cards, grids, text lines)
- Add staggered `animationDelay` for polish
- No new components needed; inline skeleton markup in each page's loading branch

