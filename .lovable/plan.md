

## Add Delete & Ban Users to Admin User Management

Currently there is no way to delete or ban users from the Admin Users dashboard. This plan adds both capabilities.

### Database Changes

**1. New `banned_users` table** — stores permanently banned emails so they cannot re-register:
```sql
CREATE TABLE public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  banned_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
-- Only admins can read/write
CREATE POLICY "Admins manage bans" ON public.banned_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

**2. New edge function `delete-user`** — uses the service role key to:
- Look up the user's email from `auth.admin.getUserById()`
- Delete related rows: `profiles`, `user_roles`, `tenant_admins`, `user_service_interests`, `tournament_registrations`, `quest_completions`, `challenge_enrollments`, `season_scores`, `notifications`, `notification_preferences`, `match_results` (nullify player refs), `discord_bypass_requests`, `player_quest_xp`, `user_achievements`
- If `ban: true` flag is passed, insert email into `banned_users` before deleting
- Call `auth.admin.deleteUser(userId)` to remove the auth record
- Returns `{ success: true, banned: bool }`

**3. Registration ban check** — add a check in the existing signup flow. In `Auth.tsx`, after successful signup call a small edge function or RPC that checks `banned_users` for the email. Alternatively, add a database trigger on `auth.users` insert — but since we can't modify `auth` schema, we'll add the check in the `handle_new_user` function or as a frontend pre-check before calling `signUp`.

Actually, the cleanest approach: create an edge function `check-ban-status` that the Auth page calls before `supabase.auth.signUp()`. If banned, show an error and block registration.

### Frontend Changes

**4. `useAdminUsers.ts`** — add two new mutations:
- `deleteUser`: calls `delete-user` edge function with `{ user_id, ban: false }`
- `banUser`: calls `delete-user` edge function with `{ user_id, ban: true }`

**5. `AdminUsers.tsx`** — add an "Actions" column (or extend the existing Set Role column) with:
- A trash icon button → opens ConfirmDialog for delete ("This will permanently remove all user data. They can re-register.")
- A ban icon button → opens ConfirmDialog for ban ("This will permanently remove all user data AND prevent them from registering again.")
- Both disabled for the current user's own row
- Both show loading state during mutation

**6. `Auth.tsx`** — before calling `signUp`, invoke `check-ban-status` with the email. If banned, show a toast error "This account has been permanently banned" and prevent registration.

### Files to Create/Modify
- **New**: `supabase/functions/delete-user/index.ts`
- **New**: `supabase/functions/check-ban-status/index.ts`
- **New migration**: `banned_users` table + RLS
- **Edit**: `src/hooks/useAdminUsers.ts` — add `deleteUser` and `banUser` mutations
- **Edit**: `src/pages/admin/AdminUsers.tsx` — add action buttons with confirm dialogs
- **Edit**: `src/pages/Auth.tsx` — add ban check before signup

### Technical Details
- The `delete-user` edge function uses `SUPABASE_SERVICE_ROLE_KEY` (already configured) to access `auth.admin` API
- Cascade deletion order matters: delete dependent rows first, then profile, then auth user
- The ban check is a lightweight pre-signup call that won't affect login flow (only signup)
- Both delete and ban require a two-step confirmation dialog with destructive styling

