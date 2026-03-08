

## Consolidate "Panel" → "Dashboard" Across All Role Sidebars

### Problem
The UI inconsistently uses "Panel" (Admin Panel, Moderator Panel, Marketing Panel, Tenant Panel) and "Dashboard" (Admin Dashboard, Tenant Dashboard) to describe the same concept. We will standardize on **"Dashboard"** everywhere.

### Changes

**1. Sidebar headers** — rename the bold title text:

| File | Current | New |
|------|---------|-----|
| `src/components/admin/AdminSidebar.tsx` | "Admin Panel" | "Admin Dashboard" |
| `src/components/moderator/ModeratorSidebar.tsx` | "Moderator Panel" | "Moderator Dashboard" |
| `src/components/admin/MarketingSidebar.tsx` | "Marketing Panel" | "Marketing Dashboard" |

**2. Mobile layout headers** — rename the mobile top-bar label:

| File | Current | New |
|------|---------|-----|
| `src/components/admin/AdminLayout.tsx` | "Admin Panel" | "Admin Dashboard" |
| `src/components/moderator/ModeratorLayout.tsx` | "Moderator Panel" | "Moderator Dashboard" |
| `src/components/admin/MarketingLayout.tsx` | "Marketing Panel" | "Marketing Dashboard" |

**3. Main app sidebar links** (`src/components/AppSidebar.tsx`) — rename tooltip and label:

- "Admin Panel" → "Admin Dashboard"
- "Moderator Panel" → "Moderator Dashboard"
- "Tenant Panel" → "Tenant Dashboard"

**4. Guide content** (`src/pages/admin/AdminGuide.tsx`, `src/pages/moderator/ModeratorGuide.tsx`) — find/replace "Panel" → "Dashboard" in descriptive text where it refers to these sections.

**5. Tenant admin panel reference** (`src/pages/tenant/TenantTeam.tsx`) — "tenant admin panel" → "tenant admin dashboard".

All changes are string replacements only — no logic or structural changes.

