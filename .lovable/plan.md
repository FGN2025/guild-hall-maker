

# Add Full Challenge Management to Admin Panel

## Problem
The Admin Challenges page is currently view-only with just "View" and "Delete" actions. By contrast, Admin Tournaments has a "Manage" button. The Moderator Challenges page already has toggle active/inactive and evidence review capabilities that admins should also have access to.

## What Gets Added

### 1. Toggle Active/Inactive Status
- Add an inline `Switch` toggle in both list and grid views (matching the moderator pattern)
- Add a toggle in the details dialog as well

### 2. Edit Challenge Dialog
- New `EditChallengeDialog` component for inline editing of challenge fields: name, description, difficulty, type, points (1st/2nd/3rd/participation), dates, estimated minutes, evidence requirement, cover image, and max enrollments
- Accessible via an "Edit" button in list actions, grid cards, and the details dialog

### 3. Evidence Review Tab
- Port the evidence review workflow from `ModeratorChallenges.tsx` into the admin page using Tabs (matching moderator pattern)
- Challenge selector dropdown, enrollment list with per-evidence approve/reject and feedback notes
- Enrollment-level approve-all/reject actions

### 4. Updated Actions
- List view: Add Edit icon button alongside View and Delete
- Grid view: Add Edit button alongside View and Delete
- Details dialog: Add Edit and Toggle Active buttons alongside View and Delete

## Files Changed

### `src/components/challenges/EditChallengeDialog.tsx` (new)
- Reusable dialog for editing an existing challenge
- Pre-populates form with current values, updates via `supabase.from("challenges").update()`
- Accepts `challenge` prop and `invalidateQueryKey`

### `src/pages/admin/AdminChallenges.tsx` (modified)
- Wrap content in `Tabs`: "Oversight" tab (existing grid/list) + "Evidence Review" tab
- Add `toggleMutation` for active/inactive switching
- Add `Switch` in list rows and grid cards
- Add Edit button triggering `EditChallengeDialog`
- Add evidence review tab with enrollment listing, evidence display, approve/reject per evidence item, and enrollment-level actions (ported from ModeratorChallenges)
- Import additional components: `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Switch`, `Label`, `Pencil`/`Edit` icon

No database or RLS changes needed -- admins already have full access via existing policies.

