# Move Redemptions to Admin-only

Prize redemption review should be an Admin-only function. Moderators currently see it in their sidebar/dashboard, can hit `/moderator/redemptions`, and the database RLS allows them to view and update any redemption. We'll remove that access at every layer.

## Changes

### 1. New Admin page + route
- Add `src/pages/admin/AdminRedemptions.tsx` — same UI as today's `ModeratorRedemptions.tsx` (keeps the prize CRUD + redemption review tabs intact, just relocated).
- Register `/admin/redemptions` in `src/App.tsx` behind `<AdminRoute>`.
- Add a "Redemptions" entry (Gift icon) to `src/components/admin/AdminSidebar.tsx`, placed near Points Rubric.
- Add a Redemptions tile to `AdminDashboard.tsx` so it has parity with other admin sections.

### 2. Remove from Moderator surface
- Delete `src/pages/moderator/ModeratorRedemptions.tsx`.
- Remove the `/moderator/redemptions` route + lazy import from `src/App.tsx`.
- Remove the Redemptions item from `src/components/moderator/ModeratorSidebar.tsx`.
- Remove the Redemptions tile from `src/pages/moderator/ModeratorDashboard.tsx`.
- Anyone hitting `/moderator/redemptions` will fall through to the existing 404.

### 3. Tighten RLS (database migration)
Replace the moderator-inclusive policies on `public.prize_redemptions` with admin-only ones:
- Drop `Moderators can view all redemptions` and `Moderators can update redemptions`.
- Add `Admins can view all redemptions` (SELECT, `has_role(auth.uid(),'admin')`).
- Add `Admins can update redemptions` (UPDATE, same check).
- Keep the existing user-scoped SELECT and INSERT policies intact so players can still request and see their own.

### 4. Documentation touch-ups
- Remove the "Redemptions" line from `src/pages/moderator/ModeratorGuide.tsx` and the moderator guide entries in `src/components/guides/QuickReferenceCard.tsx` if present.
- Add a brief Redemptions section to `src/pages/admin/AdminGuide.tsx` mirroring what was in the mod guide.

## Out of scope
- No changes to prize CRUD permissions or to the redemption trigger/limit logic added previously.
- No data migration — existing redemption rows are unchanged.
- Tenant-scoped redemptions (none exist) are not introduced here.

## Files touched
- New: `src/pages/admin/AdminRedemptions.tsx`, one Supabase migration.
- Edit: `src/App.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/pages/admin/AdminDashboard.tsx`, `src/components/moderator/ModeratorSidebar.tsx`, `src/pages/moderator/ModeratorDashboard.tsx`, `src/pages/moderator/ModeratorGuide.tsx`, `src/pages/admin/AdminGuide.tsx`, `src/components/guides/QuickReferenceCard.tsx` (if it lists Redemptions).
- Delete: `src/pages/moderator/ModeratorRedemptions.tsx`.
