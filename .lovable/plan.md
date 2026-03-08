

## Reorder Admin Sidebar Items

### Change

In `src/components/admin/AdminSidebar.tsx`, move the `Tenants`, `Notebooks`, and `Legacy Import` entries below `Ecosystem` in the `sidebarItems` array.

**New order:**
1. Dashboard
2. Media Library
3. Users
4. Tournaments
5. Challenges
6. Games
7. Seasons
8. Achievements
9. Access Requests
10. Bypass Codes
11. Marketing
12. Ecosystem
13. Tenants
14. Notebooks
15. Legacy Import
16. Settings
17. Admin Guide

Single file change: `src/components/admin/AdminSidebar.tsx` — reorder the `sidebarItems` array.

