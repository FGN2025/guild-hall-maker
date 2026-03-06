

# Add List/Grid Views and Details Dialogs to Moderator Challenges and Tournaments

## Problem
The Moderator panel's Challenges and Tournaments pages only have a simple table view with no search, filters, grid cards, or details dialogs. The Admin panel already has rich dual-view interfaces (list + grid), search, status/difficulty filters, and clickable detail dialogs. The moderator pages should match this experience.

## Changes

### `src/pages/moderator/ModeratorChallenges.tsx`
- Add search input, difficulty filter, and status (active/inactive) filter
- Add list/grid view toggle buttons
- Add grid card view matching the admin pattern: hero image, difficulty badge, active toggle, stats (enrolled, points, minutes), and action buttons (Edit, View, Delete)
- Add a details dialog showing full challenge metadata (description, dates, difficulty, type, points breakdown, evidence requirement, estimated minutes) with action buttons
- Add `EditChallengeDialog` integration for inline editing
- Add delete with `AlertDialog` confirmation
- Import `useMemo` for filtering, `format` from date-fns, and additional UI components (`Dialog`, `AlertDialog`, `EditChallengeDialog`, icons)

### `src/pages/moderator/ModeratorTournaments.tsx`
- Add search input and status filter dropdown
- Add list/grid view toggle buttons
- Add grid card view matching the admin pattern: hero image (game cover or tournament image), status badge, stats (date, players, prize), and action buttons (Bracket, Manage, Delete)
- Add a details dialog showing full tournament metadata (description, start date, players, prize pool, format, rules) with action buttons (Manage, View Bracket, Delete)
- Add delete with `AlertDialog` confirmation
- Fetch game covers and registration counts (matching admin query pattern)
- Import `useMemo`, `format`, `Dialog`, `AlertDialog`, `PrizeDisplay`, `Card`, navigation icons

No database or backend changes needed.

