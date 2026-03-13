

## Plan: Add Trophy Icon to Prize Element on Tournament Card

### Change

In `src/components/tournaments/TournamentCard.tsx`, add a `Trophy` icon above the `PrizeDisplay` component in the Prize cell, matching the icon style used by Date and Players cells.

**File: `src/components/tournaments/TournamentCard.tsx`**
- Import `Trophy` from `lucide-react` (already imported on line 1)
- In the Prize cell (lines 74-79), add `<Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mx-auto mb-1" />` above the `PrizeDisplay` div

