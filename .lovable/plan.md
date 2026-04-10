

## Support URL-based game filter on Challenges page

### Summary
Allow linking directly to a filtered Challenges page via a query parameter, e.g. `/challenges?game=Farm+Simulator+2025`. This lets you share filtered links in invitations and emails. The existing filter tabs continue to work — clicking a tab updates the URL, and arriving with a `?game=` param pre-selects that filter.

### Changes

**`src/pages/Challenges.tsx`**
- Import `useSearchParams` from `react-router-dom`
- Initialize `gameFilter` state from `searchParams.get("game")` instead of `null`
- When a filter tab is clicked, update both local state and the URL search param
- When "All Games" is clicked, remove the `game` param from the URL

No new files, no database changes. Just a small update to the existing Challenges page component.

### Example URLs
- `/challenges` — shows all challenges (current behavior)
- `/challenges?game=Farm+Simulator+2025` — lands with Farm Simulator 2025 pre-selected
- `/challenges?game=American+Truck+Simulator` — lands with ATS pre-selected

