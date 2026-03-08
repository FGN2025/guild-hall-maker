

## Problem

The "Pick from Widget Library" button in the embed_widget section opens the MediaPickerDialog showing **all** categories. It should be filtered to only show widget/embed items.

## Plan

The `MediaPickerDialog` currently only supports `excludeCategories`. Rather than listing every non-widget category to exclude, we should add an `initialTab` prop to auto-select the "widget" tab when opened from the embed widget picker.

### Changes

| File | Change |
|---|---|
| `MediaPickerDialog.tsx` | Add optional `initialTab?: string` prop. Use it as the default value for the `tab` state, and reset tab to it when dialog opens. |
| `SectionEditor.tsx` | Pass `initialTab="widget"` to the `MediaPickerDialog` in the `embed_widget` case. |

This is a minimal two-line change that filters the picker to the widget category by default while still allowing the user to browse other tabs if needed.

