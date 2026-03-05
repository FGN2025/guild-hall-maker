

# Make Calendar Publishing Accessible to Marketing Role

## Problem
The CalendarPublishManager is currently only accessible in two places:
1. **Admin Settings** (`/admin/settings`) — admin-only
2. **Tenant Marketing** (`/tenant/marketing`) — tenant roles only

The marketing role sees a "Marketing" link in the app sidebar pointing to `/admin/marketing`, but that route is wrapped in `AdminRoute` which blocks non-admin users. Marketing users get redirected to the dashboard.

## Solution

### 1. Create a Marketing Route wrapper (`src/components/admin/MarketingRoute.tsx`)
A new route guard that allows both `isAdmin` and `isMarketing` roles, using `AdminLayout` for consistent navigation.

### 2. Update routing in `src/App.tsx`
Change the `/admin/marketing` route from `<AdminRoute>` to `<MarketingRoute>` so marketing-role users can access it.

### 3. Add CalendarPublishManager to AdminMarketing page (`src/pages/admin/AdminMarketing.tsx`)
Import and render the `CalendarPublishManager` component as a prominent section on the marketing page, so it's immediately visible and accessible to marketing users alongside campaigns.

### 4. Update AdminSidebar active-state matching
The sidebar currently uses exact match (`pathname === item.to`). For `/admin/marketing` this already works, but we should ensure marketing-only users who land on the admin layout see the correct sidebar. Since `MarketingRoute` will use `AdminLayout`, the sidebar will render — but marketing users will only be able to access the marketing page. This is acceptable since all other admin links will redirect them away.

## Summary of files changed
- **New**: `src/components/admin/MarketingRoute.tsx` — route guard allowing admin + marketing roles
- **Edit**: `src/App.tsx` — swap `AdminRoute` for `MarketingRoute` on `/admin/marketing`
- **Edit**: `src/pages/admin/AdminMarketing.tsx` — add `CalendarPublishManager` section prominently at the top

