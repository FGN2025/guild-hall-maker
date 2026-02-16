

## Fix: Double Sidebar on Admin Games Page

### Problem
The Admin Games page renders **two identical sidebars** because the `AdminLayout` component (which contains the sidebar) is being applied twice:

1. `AdminRoute` in `App.tsx` wraps children in `AdminLayout`
2. `AdminGames` itself **also** wraps its content in `AdminLayout`

No other admin page has this issue -- it only affects `/admin/games`.

### Solution
Remove the extra `<AdminLayout>` wrapper from `AdminGames.tsx`. The page content should render directly without its own layout, since `AdminRoute` already provides it.

### Technical Details
- **File**: `src/pages/admin/AdminGames.tsx`
  - Remove the `import AdminLayout` statement (line 2)
  - Replace `<AdminLayout>` wrapper (line 135) with a plain fragment (`<>`)
  - Replace closing `</AdminLayout>` (line 199) with `</>`

This is a one-file, three-line change.

