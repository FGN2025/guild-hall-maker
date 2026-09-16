# Separate Challenges and Quests in Admin

Split the combined "Challenges & Quests" admin page into two standalone pages with their own sidebar entries.

## What you will see

- The admin sidebar gets two entries instead of one: **Challenges** and **Quests** (right after it).
- **Challenges** page (`/admin/challenges`) shows only challenge management: the search/filter bar, list/grid views, drag-to-reorder, New Challenge / Generate with Agent buttons, the Oversight and Evidence Review tabs, and all the existing dialogs (details, edit, delete, promo, copy-to-quest).
- **Quests** page (`/admin/quests`) shows the full quest management panel (search, difficulty filter, New Quest, grid/list views, enrollment counts) exactly as it works today — just on its own page.
- The old combined page no longer has the top "Challenges | Quests" tab switcher.
- Visiting `/admin/challenges?tab=quests` redirects to the new Quests page, so any old bookmarks keep working.
- Nothing about how challenges or quests are stored, awarded, or displayed to players changes.

## Technical details

- `src/pages/admin/AdminChallenges.tsx` — remove the outer Challenges|Quests `Tabs` wrapper and the `AdminQuestsPanel` import/usage; keep everything else (inner Oversight/Evidence Review tabs, DnD list, grid, dialogs) untouched.
- New `src/pages/admin/AdminQuests.tsx` — thin page with the "Quest Management" header that renders `AdminQuestsPanel` with `queryKeyPrefix="admin" showEnrollmentCounts` (same props as today).
- `src/App.tsx` — add route `/admin/quests` → `<AdminRoute><AdminQuests /></AdminRoute>`; add a redirect from `/admin/challenges?tab=quests` to `/admin/quests`.
- `src/components/admin/AdminSidebar.tsx` — rename "Challenges & Quests" to "Challenges" (Target icon) and add "Quests" (Compass icon) pointing to `/admin/quests`.
- Verify: type-check passes; both pages render and keep their filters, view toggles, and action buttons working.
