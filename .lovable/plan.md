

## Fix: Double Sidebar on Achievements and Notebooks Pages

### Problem
Same root cause as the Marketing page fix: `AdminRoute` already wraps children in `<AdminLayout>`, but both `AdminAchievements.tsx` and `AdminNotebooks.tsx` also wrap their content in `<AdminLayout>`, causing the sidebar to render twice.

### Fix
Remove the `<AdminLayout>` wrapper and its import from both files:

**`src/pages/admin/AdminAchievements.tsx`**
- Remove `import AdminLayout from "@/components/admin/AdminLayout"`
- Replace `<AdminLayout>...</AdminLayout>` wrapper with just the inner `<div>`

**`src/pages/admin/AdminNotebooks.tsx`**
- Remove `import AdminLayout from "@/components/admin/AdminLayout"`
- Replace `<AdminLayout>...</AdminLayout>` wrapper with just the inner `<div>`

Two-file fix, identical pattern to the Marketing page fix already applied.

