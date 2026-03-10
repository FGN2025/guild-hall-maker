

## Phase 3: Polish and Integration Touchpoints

Since Phases 1-2 already delivered the database, hooks, components, pages, routes, sidebar nav, and admin/moderator tabs, Phase 3 covers the remaining polish items to bring Quests to full parity with Challenges.

### 1. Public Navbar — Add Quests link
**`src/components/Navbar.tsx`**: Add a "Quests" entry (Compass icon) to all three nav arrays (`navItems`, `authNavItems`, `publicNavItems`) so unauthenticated visitors and logged-in users see it in the top navbar.

### 2. Notification Preferences — Add `new_quest` type
**`src/hooks/useNotificationPreferences.ts`**: Add `{ key: "new_quest", label: "New Quests", description: "When a new quest is published on the platform" }` to the `NOTIFICATION_TYPES` array so users can toggle quest notifications in their settings.

### 3. Moderator Dashboard — Add Quests quick link
**`src/pages/moderator/ModeratorDashboard.tsx`**: The "Challenges" quick link card currently points to `/moderator/challenges`. Since quests are managed via a tab on that same page, update the label to "Challenges & Quests" and description to mention both.

### 4. Guide Pages — Document Quests
- **`src/pages/PlayerGuide.tsx`**: The "Challenges & Quests" section (line ~204) already has the title but only describes challenges. Add bullets explaining quests work the same way with their own enrollment, evidence, and completion flow.
- **`src/pages/moderator/ModeratorGuide.tsx`**: Add a section or bullets explaining moderators manage quests from the same Challenges page via a "Quests" tab.
- **`src/pages/admin/AdminGuide.tsx`**: Add a brief mention that admins can create and manage quests alongside challenges.

### 5. Public Access Parity
Quests already have `anon` SELECT RLS on the `quests` table and the routes use `ConditionalLayout`, so unauthenticated visitors can already browse quests. No additional RLS changes needed.

---

**Total: ~6 small edits across 5 files. No database changes required.**

