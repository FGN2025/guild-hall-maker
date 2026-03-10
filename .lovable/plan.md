

## Assessment: "Challenges & Quests" Label vs Separate Menu Items

### Current State

| Location | Current Labels | Notes |
|---|---|---|
| **Player Navbar** (top) | "Challenges" + "Quests" (separate) | Two separate links to `/challenges` and `/quests` |
| **Player Sidebar** | "Challenges" + "Quests" (separate) | Two separate links |
| **Admin Sidebar** | "Challenges" only | Leads to a page with Challenges + Quests + Chains tabs |
| **Moderator Sidebar** | "Challenges" only | Same tabbed page |
| **Moderator Dashboard** quick links | "Challenges & Quests" in description | Label says "Challenges" but description mentions both |

### Recommendation: Hybrid Approach

**Keep them separate in player-facing navigation** — players see Challenges and Quests as fundamentally different experiences (standalone tasks vs story-driven chains with XP). Separate menu items help discoverability.

**Rename to "Challenges & Quests" in admin/moderator sidebars** — since both are managed from the same tabbed page, the current "Challenges" label is misleading. Admins might not realize quest management lives there.

### Changes

1. **Admin Sidebar** — rename label from "Challenges" to "Challenges & Quests"
2. **Moderator Sidebar** — rename label from "Challenges" to "Challenges & Quests"
3. **Moderator Dashboard** quick link — rename label from "Challenges" to "Challenges & Quests"
4. **Admin Challenges page** — update page title/heading from "Challenges" to "Challenges & Quests"
5. **Moderator Challenges page** — same heading update

No route changes needed — URLs stay as `/admin/challenges` and `/moderator/challenges`. Player-facing nav (Navbar, AppSidebar) stays unchanged with separate "Challenges" and "Quests" entries.

**Files to edit:**
- `src/components/admin/AdminSidebar.tsx` — sidebar label
- `src/components/moderator/ModeratorSidebar.tsx` — sidebar label
- `src/pages/moderator/ModeratorDashboard.tsx` — quick link label + description
- `src/pages/admin/AdminChallenges.tsx` — page heading
- `src/pages/moderator/ModeratorChallenges.tsx` — page heading

