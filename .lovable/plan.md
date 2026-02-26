

## Add Admin-Configurable Image Upload Limits

### Overview
Store image validation limits in the `app_settings` table as a JSON value, add a UI section to the Admin Settings page to configure them, and update the validation logic to fetch these settings at runtime instead of using hardcoded values.

### 1. Insert a new `app_settings` row for image limits
Insert a row with `key = "image_upload_limits"` and a JSON `value` containing the current defaults:
```json
{
  "cardCover": { "maxSizeKB": 500, "minWidth": 640, "minHeight": 360 },
  "heroBanner": { "maxSizeKB": 800, "minWidth": 1280, "minHeight": 720 },
  "tournamentHero": { "maxSizeKB": 500, "minWidth": 640, "minHeight": 360 },
  "avatar": { "maxSizeKB": 100, "minWidth": 128, "minHeight": 128 },
  "general": { "maxSizeKB": 800 }
}
```

### 2. Create a hook to fetch image limits (`src/hooks/useImageLimits.ts`)
- Query `app_settings` for `key = "image_upload_limits"`.
- Parse the JSON value and merge with hardcoded defaults from `IMAGE_PRESETS` as fallback.
- Export a function `getPreset(name)` that returns merged `ImageValidationRules`.
- Cache with React Query so it's fetched once and shared app-wide.

### 3. Update `src/lib/imageValidation.ts`
- Add a new `validateAndToastWithOverrides(file, presetName, overrides?)` function that accepts dynamic rules.
- Keep the existing `validateAndToast` working as a fallback so nothing breaks immediately.

### 4. Update all upload components to use dynamic limits
Update these 6 files to fetch limits from the hook instead of hardcoded `IMAGE_PRESETS`:
- `src/components/games/AddGameDialog.tsx`
- `src/components/tournaments/CreateTournamentDialog.tsx`
- `src/components/tournaments/EditTournamentDialog.tsx`
- `src/components/moderator/PrizeFormDialog.tsx`
- `src/components/media/MediaUploader.tsx`
- `src/pages/admin/AdminTenants.tsx`

Each will call the hook and pass the dynamic rules to validation.

### 5. Add Image Limits section to Admin Settings (`src/pages/admin/AdminSettings.tsx`)
Add a new card section with:
- A row for each preset (Card Cover, Hero Banner, Tournament Hero, Avatar, General)
- Editable fields: Max File Size (KB), Min Width (px), Min Height (px)
- A Save button that writes the JSON back to `app_settings`
- Clear labeling so admins understand the impact of each setting

### Technical Details
- The `app_settings` table already exists with admin-only write RLS and public read -- no schema changes needed.
- The JSON value approach keeps it flexible without adding new database tables.
- Hardcoded defaults in `IMAGE_PRESETS` remain as fallbacks if the setting hasn't been configured yet.

