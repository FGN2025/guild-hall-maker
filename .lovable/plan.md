

# Plan: Add Delete Confirmation Dialog to Media Grid

## Change

**File**: `src/components/media/MediaGrid.tsx`

- Import `AlertDialog` components from `@/components/ui/alert-dialog`
- Wrap the delete button in an `AlertDialog` that asks "Are you sure you want to delete this media item?" with Cancel and Delete actions
- On confirm, call the existing `onDelete` handler

Single file change, no backend updates needed.

