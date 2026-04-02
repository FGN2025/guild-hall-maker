

## Fix Tournaments Page Crash for Unauthenticated Users

### Root Cause
`src/pages/Tournaments.tsx` imports and renders `<SidebarTrigger />` (line 6, 90). This component internally calls `useSidebar()`, which requires a `SidebarProvider` ancestor. When an unauthenticated user visits `/tournaments`, `ConditionalLayout` renders `PublicLayout` (navbar only, no sidebar provider), causing the crash.

Challenges and Quests pages likely don't use `SidebarTrigger`, which is why they work fine for guests.

### Fix — `src/pages/Tournaments.tsx`

Conditionally render `SidebarTrigger` only when the user is authenticated:

1. The `user` variable from `useAuth()` is already available (line 27)
2. Replace the unconditional `<SidebarTrigger />` on line 90 with `{user && <SidebarTrigger />}`
3. Remove the import if no other usage exists (it's only used on line 90)

This matches how Challenges and Quests handle the same scenario — they don't render sidebar controls for guests.

### Files changed

| File | Change |
|------|--------|
| `src/pages/Tournaments.tsx` | Wrap `SidebarTrigger` in `{user && ...}` guard |

