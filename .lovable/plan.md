

## Fix: `useSidebar must be used within a SidebarProvider` on /tournaments

### Root Cause

The previous sticky-header fix added `SidebarTrigger` directly into `src/pages/Tournaments.tsx`. The `/tournaments` route uses `ConditionalLayout`, which renders `PublicLayout` (no `SidebarProvider`) for unauthenticated users and `AppLayout` (has `SidebarProvider`) for logged-in users. When visiting `/tournaments` while logged out, `SidebarTrigger` calls `useSidebar()` outside any provider, crashing the page.

### Fix

**`src/pages/Tournaments.tsx`**: Remove the `SidebarTrigger` import and usage entirely. The sidebar trigger belongs in the layout (`AppLayout`), not in page components.

**`src/components/AppLayout.tsx`**: Revert the conditional `hideTopBar` logic that was hiding the header on `/tournaments`. The header with `SidebarTrigger` should render on all AppLayout routes consistently.

Two files, two small edits. No new components needed.

