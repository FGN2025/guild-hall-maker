

## Item 11: Mobile Sidebar vs Navbar Inconsistency

### Problem
The Navbar's mobile menu only shows 8 items (Tournaments, Games, Dashboard, Community, Leaderboard, Stats, Compare, Badges). The AppSidebar has 13+ items including Calendar, Challenges, Prize Shop, Ladders, Player Guide, and AI Coach — all missing from the mobile nav. Mobile users on the landing page can't discover these features.

### Plan

**File: `src/components/Navbar.tsx`**

1. Add missing items to the `navItems` array:
   - Calendar (`/calendar`, CalendarDays)
   - Challenges (`/challenges`, Target)
   - Prize Shop (`/prize-shop`, Gift)
   - Ladders (`/ladders`, SwordIcon)
   - Player Guide (`/guide`, BookOpen)

2. Add missing icon imports: `CalendarDays`, `Target`, `Gift`, `SwordIcon`, `BookOpen`

3. Add Admin, Moderator, and Tenant links to the mobile menu (already present in desktop nav but missing from mobile dropdown) — these conditional links for `isAdmin`, `isModerator`, and `isTenantAdmin` should appear in the mobile menu section as well.

4. Keep the desktop nav unchanged — it already shows the core items and the conditional role links. The additional items (Calendar, Challenges, etc.) will appear in both desktop and mobile to maintain parity with the sidebar.

**Note:** The AI Coach button requires the `CoachContext`, which the Navbar doesn't currently consume. Rather than adding that dependency to the landing page nav, we'll omit AI Coach from the Navbar since it's only relevant for authenticated users who see the sidebar anyway.

