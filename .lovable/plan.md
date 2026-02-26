

## Fix: Tournament Click Navigation on Player Dashboard

**Problem**: In the "My Tournaments" section of the Player Dashboard, clicking a tournament navigates to `/tournaments` (the listing page) instead of the specific tournament's detail page (`/tournaments/:id`).

**Fix**: Update the `onClick` handler in `src/pages/Dashboard.tsx` to navigate to `/tournaments/${t.id}` instead of `/tournaments`.

### Changes

**File: `src/pages/Dashboard.tsx`**
- Line 79: Change `onClick={() => navigate("/tournaments")}` to `onClick={() => navigate(`/tournaments/${t.id}`)}`
- This matches the pattern already used in `TournamentCard.tsx` which navigates to `/tournaments/${t.id}`

This is a one-line fix.
