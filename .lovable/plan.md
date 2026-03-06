

# Add "Create Challenge" Button to Admin Challenges Page

## Summary
Port the challenge creation dialog from `ModeratorChallenges.tsx` into `AdminChallenges.tsx`, giving admins the ability to create challenges directly without navigating to the moderator panel.

## Changes

### `src/pages/admin/AdminChallenges.tsx`
- Add the same create challenge dialog that exists in `ModeratorChallenges.tsx`:
  - Form state for name, description, difficulty, type, dates, points, cover image, estimated minutes, evidence toggle, and task builder
  - Game selector dropdown (query `games` table)
  - AI description enhancement button (calls `enhance-challenge-description` edge function)
  - Task/objective builder with add/remove
  - Create mutation that inserts into `challenges` and `challenge_tasks`
- Add a "New Challenge" button next to the view toggle in the header
- Reuse `useAuth` for `user.id` as `created_by`
- Invalidate `admin-challenges` query key on success
- Add required imports: `Textarea`, `Label`, `Switch`, `DialogTrigger`, `Plus`, `Sparkles`, `Loader2`, `useAuth`

No database or RLS changes needed — admins already have full access via the existing "Moderators can manage challenges" policy which includes the admin role.

