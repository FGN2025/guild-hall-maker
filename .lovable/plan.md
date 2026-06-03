# Calendar Image Admin Tool

Add a small admin page that lets Platform Admins upload a calendar image for any month/year. The public `/calendar` page automatically displays the image for the currently-viewed month.

## User flow

1. Admin navigates to **Admin → Calendar Images** (new sidebar entry under the Admin section).
2. Sees a list of all uploaded monthly images (thumbnail + month label + replace/delete buttons).
3. Clicks **Upload** → picks month + year + image file → saves.
4. On `/calendar`, the image below the grid now reflects whichever month the user is browsing. If no image exists for that month, the image block is hidden.

## Backend

**Storage bucket** (public): `calendar-images`
- Files stored at `YYYY-MM.png` (or original extension).
- Public read so anonymous visitors on `/calendar` can see it.

**Table**: `public.calendar_monthly_images`
- `id` uuid PK
- `year` int, `month` int (1-12), unique together
- `image_url` text
- `storage_path` text
- `uploaded_by` uuid, `created_at`, `updated_at`

**RLS / grants**:
- `SELECT` to `anon` + `authenticated` (public calendar viewers).
- `INSERT/UPDATE/DELETE` restricted to Platform Admins via `has_role(auth.uid(),'admin')`.
- Storage policies on `calendar-images` bucket: public read; admin-only write/delete.

## Frontend

**New page**: `src/pages/admin/AdminCalendarImages.tsx`
- Grid of existing images with month/year label, thumbnail, Replace, Delete.
- Upload dialog: month + year selectors, file picker, preview, save.
- Uses a new `useCalendarImages` hook (list, upsert, delete).

**Route**: add `/admin/calendar-images` in `src/App.tsx` under the admin section, gated by admin role.

**Sidebar**: add "Calendar Images" entry in the Admin section of `AppSidebar.tsx`.

**Admin Dashboard**: add a stat card linking to the new page.

**Public calendar update** (`src/pages/TournamentCalendar.tsx`):
- Replace hardcoded `/images/June_2026_calendar_square.png` with a lookup against `calendar_monthly_images` keyed off `currentMonth`.
- If no row exists for that month, hide the image block.
- Keep the existing frosted-glass container styling.

## Out of scope
- Per-tenant calendar images (platform-wide only for now).
- Scheduling/auto-rotation.
- The legacy `/images/April_2026_calendar_square.png` and `June_2026_calendar_square.png` files stay in `/public` as fallbacks; can be removed after the first DB-backed upload.
