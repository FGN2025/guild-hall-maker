

## Plan: Remove Duplicate Admin Sidebar

### Root cause
`AdminRoute` (in `src/components/admin/AdminRoute.tsx` line 28) already wraps its children in `<AdminLayout>` — which renders the `AdminSidebar`. Two admin pages incorrectly wrap themselves in `<AdminLayout>` again, causing the layout to nest:
`AdminLayout (from AdminRoute) → AdminLayout (from page) → content` → two sidebars side-by-side.

### Affected files
1. `src/pages/admin/AdminCloudGaming.tsx` — visible bug per screenshot
2. `src/pages/admin/AdminLegacyUsers.tsx` — same bug, just not noticed yet

All other admin pages (e.g. `AdminEcosystem`, `AdminTournaments`, `AdminGameServers`) correctly return their content directly with no `AdminLayout` wrapper.

### Fix
For each affected file:
- Remove the `import AdminLayout from "@/components/admin/AdminLayout";` line
- Replace the outer `<AdminLayout>...</AdminLayout>` JSX wrapper with a plain fragment `<>...</>` (or just return the inner `<div className="space-y-6">` directly)

No changes needed to `AdminRoute`, `AdminLayout`, `AdminSidebar`, or routing — those are correct.

### Verification
After the fix, `/admin/cloud-gaming` and `/admin/legacy-users` should display a single Admin Dashboard sidebar matching every other admin page.

