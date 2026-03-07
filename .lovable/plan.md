

# Admin Games: List/Grid View Toggle, Sorting, and Bulk Delete

## Current State
The AdminGames page has a single table (list) view with drag-and-drop reordering, individual edit/delete actions, and active toggle. No grid/detail view, no column sorting, no bulk selection.

## Plan

### 1. Add view toggle (List / Grid)
- Add a `viewMode` state (`"list" | "grid"`)
- Add toggle buttons (LayoutList / LayoutGrid icons) next to the "Add Game" button
- **List mode**: Current table view (with enhancements below)
- **Grid mode**: Card-based layout showing cover image, name, category badge, active status, with a checkbox overlay for bulk selection and edit/delete actions on hover

### 2. Add column sorting
- Add `sortField` and `sortDirection` state
- Sortable columns: Name, Category, Slug, Active status
- Clicking a column header toggles ascending/descending sort
- Show ArrowUpDown / ArrowUp / ArrowDown icons on sortable headers
- Sort is applied via `useMemo` on the games array (client-side)
- Drag-and-drop reorder remains available but only when sort is "default" (display_order)

### 3. Add bulk delete
- Add `selectedIds` state (Set of game IDs)
- Add a checkbox column in list view and checkbox overlay in grid view
- Add a "Select All" checkbox in the table header
- When selections exist, show a bulk action bar: "{N} selected — Delete Selected" button with confirmation dialog
- Add a `useBulkDeleteGames` mutation to `useGames.ts` that deletes multiple IDs in one call
- Individual delete remains via the trash icon per row

### Files Changed

| File | Change |
|---|---|
| `src/pages/admin/AdminGames.tsx` | Add view toggle, sort state, selection state, bulk action bar, grid view rendering |
| `src/hooks/useGames.ts` | Add `useBulkDeleteGames` mutation |

No database changes needed — existing RLS allows admin full access to the games table.

