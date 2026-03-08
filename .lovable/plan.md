

## Reorder Admin Sidebar: Move Marketing Above Access Requests

### Change

In `src/components/admin/AdminSidebar.tsx`, move the `Marketing` entry so it appears after `Achievements` and before `Access Requests`.

**New order:**
1. Dashboard
2. Media Library
3. Users
4. Tournaments
5. Challenges
6. Games
7. Seasons
8. Achievements
9. **Marketing**
10. Access Requests
11. Bypass Codes
12. Ecosystem
13. Tenants
14. Notebooks
15. Legacy Import
16. Settings
17. Admin Guide

Single file change: `src/components/admin/AdminSidebar.tsx` — reorder the `sidebarItems` array.

