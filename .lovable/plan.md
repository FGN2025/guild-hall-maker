

## Assessment: Marketing Panel Lacks Dedicated Navigation

### Current State

| Panel | Layout | Sidebar | Route Guard |
|-------|--------|---------|-------------|
| **Admin** | `AdminLayout` | `AdminSidebar` (17 items) | `AdminRoute` |
| **Moderator** | `ModeratorLayout` | `ModeratorSidebar` | `ModeratorRoute` |
| **Tenant** | `TenantLayout` | `TenantSidebar` (role-filtered) | `TenantRoute` |
| **Marketing** | `AdminLayout` ← problem | `AdminSidebar` ← full admin nav | `MarketingRoute` |

**The disconnect:** `MarketingRoute` (line 27) wraps its children in `AdminLayout`, which renders the full `AdminSidebar` with all 17 admin items. A marketing-role user sees Dashboard, Users, Tournaments, Ecosystem, Tenants, etc. — pages they cannot access. This is both a UX issue (confusing/broken links) and a visual inconsistency with Moderator and Tenant panels, which each have scoped sidebars.

### Proposed Plan

Create a dedicated `MarketingLayout` and `MarketingSidebar`, following the exact same pattern as `ModeratorLayout`/`ModeratorSidebar`.

#### 1. Create `src/components/admin/MarketingSidebar.tsx`
- Header: "Marketing Panel" branding with "Back to App" link
- Scoped nav items relevant to marketing users only:
  - **Campaigns** → `/admin/marketing` (the existing tabbed view with Campaigns, Calendars, Web Pages)
  - **Media Library** → `/admin/media`
  - **Admin Guide** → `/admin/guide`
- Mobile-responsive, same styling as `ModeratorSidebar` and `AdminSidebar`

#### 2. Create `src/components/admin/MarketingLayout.tsx`
- Same pattern as `ModeratorLayout`: desktop sidebar + mobile Sheet drawer
- Replaces `AdminLayout` usage in `MarketingRoute`

#### 3. Update `src/components/admin/MarketingRoute.tsx`
- Change `AdminLayout` import to `MarketingLayout`
- One-line change on line 27

#### 4. Add route guards for Media and Guide under MarketingRoute
- In `src/App.tsx`, add `MarketingRoute`-wrapped duplicates for `/admin/media` and `/admin/guide` so marketing users can access them, OR refactor those routes to accept both `AdminRoute` and `MarketingRoute`. The simplest approach: keep existing `AdminRoute` wrappers and add marketing-accessible aliases (e.g. the sidebar links point to the existing admin routes, and `MarketingRoute` already allows both `isAdmin` and `isMarketing` users).

Since `MarketingRoute` already permits both admins and marketing users, and `AdminRoute` only permits admins, we need to wrap the media and guide routes with `MarketingRoute` instead of `AdminRoute` (this is backwards-compatible since `MarketingRoute` allows admins too).

### Files Changed
- **New:** `src/components/admin/MarketingSidebar.tsx`
- **New:** `src/components/admin/MarketingLayout.tsx`
- **Edit:** `src/components/admin/MarketingRoute.tsx` — swap `AdminLayout` → `MarketingLayout`
- **Edit:** `src/App.tsx` — change route guards for `/admin/media` and `/admin/guide` from `AdminRoute` to `MarketingRoute`

### Result
Marketing-role users get a focused 3-item sidebar matching the pattern of Moderator and Tenant panels. Admin users accessing `/admin/marketing` still see the full admin sidebar (they enter via `AdminRoute`). Marketing-only users get the scoped experience.

