## Root cause
`src/pages/TournamentManage.tsx` calls `useQuery` for `placementCount` at line 110 — **after** two conditional early returns (loading at line 73, access-denied at line 83). React requires hooks to run in the same order every render. On the first render the early `return` happens before the `useQuery`, so the hook count differs once the page renders fully → React minified error #310 ("Something went wrong" page) whenever admins open Manage Tournament for a completed (or any) tournament.

Note: the `EditTournamentDialog` itself isn't broken — the page crashes before/around it.

## Fix
Move the `useQuery({ queryKey: ["tournament-placement-count", id], ... })` block **above** the `if (isLoading)` early return so it runs on every render. Its `enabled` flag already guards execution.

```tsx
const { data: placementCount = 0 } = useQuery({ ... });  // move here, right after useTournamentManagement

if (isLoading) { ... }
if (!tournament || !isOwner) { ... }
```

No other changes — single-file, single-block move. Nothing about tournament edit logic or RLS is affected.
