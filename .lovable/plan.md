
Goal: remove the lingering “minimum 640px” validation so 533px-wide covers upload successfully.

What I found
- The frontend code is already updated (`cardCover` and `tournamentHero` are 320x180 in `src/lib/imageValidation.ts`).
- The live app is still loading old limits from backend settings (`app_settings.key = 'image_upload_limits'`), which currently contains:
  - `cardCover.minWidth = 640`, `minHeight = 360`
  - `tournamentHero.minWidth = 640`, `minHeight = 360`
- `useImageLimits` applies backend overrides on top of code presets, so backend values win.

Implementation plan
1) Patch persisted backend limits (durable fix)
- Add a migration that updates `app_settings.value` for `image_upload_limits` from legacy 640x360 to 320x180 for:
  - `cardCover`
  - `tournamentHero`
- Make the SQL conditional so it only rewrites legacy values (doesn’t override intentionally customized non-legacy limits).

2) Improve settings merge behavior (prevent confusion in admin UI)
- In `src/pages/admin/AdminSettings.tsx`, change the load merge from shallow object spread to per-preset deep merge:
  - Keep defaults from `IMAGE_PRESETS`
  - Overlay only provided fields from stored JSON
- This avoids legacy/incomplete JSON causing odd states in the limits editor.

3) Keep runtime logic unchanged (already correct after data fix)
- No changes needed in upload components once backend values are corrected.
- `AddGameDialog` will automatically use the corrected limits via `useImageLimits`.

Validation plan
- Confirm backend row after migration: `cardCover.minWidth=320`, `minHeight=180`, `tournamentHero.minWidth=320`, `minHeight=180`.
- Hard refresh `/admin/games` and retry the same image upload (533px wide) → should pass dimension validation.
- Smoke-test another uploader using `cardCover` preset (e.g., challenges/prizes) to confirm behavior is consistent.

Technical details
- Files to change:
  - `supabase/migrations/<new_migration>.sql` (data update for `app_settings`)
  - `src/pages/admin/AdminSettings.tsx` (deep-merge normalization on fetch)
- No schema change required.
- No auth/RLS policy changes required (data update only).
