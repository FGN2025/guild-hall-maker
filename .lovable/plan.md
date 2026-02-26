

## Add Enable/Disable Checkbox for Each Image Upload Limit Preset

### Overview
Add a checkbox next to each preset row in the Admin Settings "Image Upload Limits" section. When unchecked, validation for that preset is skipped entirely, allowing unrestricted uploads. The enabled/disabled state is stored alongside the existing limit values in the same JSON setting.

### 1. Update `LimitEntry` interface and defaults in `AdminSettings.tsx`
- Add an `enabled: boolean` field to `LimitEntry` (default `true`)
- Update `getDefaults()` to include `enabled: true` for each preset
- Add a 5th column header "Enabled" to the grid
- Add a `Checkbox` component in each row that toggles the `enabled` field
- Disable (grey out) the numeric inputs when the preset is unchecked
- Import `Checkbox` from `@/components/ui/checkbox`

### 2. Update the grid layout
- Change `grid-cols-4` to `grid-cols-5` for both header and data rows
- The first column becomes the checkbox, followed by Preset name, Max Size, Min Width, Min Height

### 3. Update `useImageLimits.ts` hook
- Add `enabled?: boolean` to the `OverrideEntry` interface
- In `getPreset()`, when `enabled` is explicitly `false`, return rules with extremely permissive values (e.g., `maxSizeKB: 999999`, no dimension constraints) so validation effectively passes everything
- This keeps the validation pipeline intact without needing conditional skips in every upload component

### 4. Persist the `enabled` state
- The existing JSON save/load already handles arbitrary fields -- the `enabled` boolean will be included automatically when saving `imgLimits` to `app_settings`

### Technical Details

**AdminSettings.tsx changes:**
- Import `Checkbox` from UI components
- Add `enabled` to `LimitEntry` interface
- Update grid to 5 columns with checkbox in first position
- Inputs are visually disabled (reduced opacity + `disabled` prop) when unchecked
- `getDefaults()` sets `enabled: true` for all presets

**useImageLimits.ts changes:**
- When `enabled === false`, `getPreset()` returns a no-op ruleset: `{ maxSizeKB: Infinity, label: base.label }` -- no format, size, or dimension checks will trigger

