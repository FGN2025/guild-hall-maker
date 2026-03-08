

## Problem

1. **Duplicate sidebar**: `AdminWebPages` wraps itself in `<AdminLayout>` (lines 31, 38), but the route already wraps it in `<MarketingRoute>` which also renders `<AdminLayout>`. This causes a double sidebar as shown in the screenshot.

2. **"Web Pages" is a separate sidebar item** instead of being grouped under Marketing alongside Campaigns and Events.

## Plan

### 1. Fix duplicate layout in `AdminWebPages.tsx`
Remove the two `<AdminLayout>` wrappers — the route-level `MarketingRoute` already provides the layout.

### 2. Remove "Web Pages" from `AdminSidebar.tsx`
Delete the `{ to: "/admin/web-pages", label: "Web Pages", icon: FileText }` entry from the sidebar items array.

### 3. Add Web Pages tab inside `AdminMarketing.tsx`
Add a `Tabs` component with two tabs: **Campaigns** (existing content) and **Web Pages** (embed `AdminWebPages` content inline or import a lightweight version). This groups everything under the Marketing section.

### 4. Remove standalone route
Remove the `/admin/web-pages` route from `App.tsx` since Web Pages will now be accessed via the Marketing page's tab.

### Files changed

| File | Change |
|---|---|
| `src/pages/admin/AdminWebPages.tsx` | Remove `<AdminLayout>` wrappers (or delete file entirely if inlined into Marketing) |
| `src/components/admin/AdminSidebar.tsx` | Remove "Web Pages" sidebar entry |
| `src/pages/admin/AdminMarketing.tsx` | Add Tabs with "Campaigns" and "Web Pages" tabs; embed web pages list/editor in the second tab |
| `src/App.tsx` | Remove `/admin/web-pages` route (or keep it as a redirect to `/admin/marketing`) |

