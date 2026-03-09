

## Add Admin Edit & Delete to Challenge Detail — Players Excluded

### Security Analysis

Players **cannot** edit or delete challenges — this is already enforced at the database level:
- The `challenges` table RLS only grants write access (INSERT/UPDATE/DELETE) to users with `admin` or `moderator` roles
- Regular authenticated users only have SELECT on active challenges
- Even if a player somehow triggered a delete/update call, the database would reject it

### Frontend Guardrails

The UI will use the `isAdmin` flag from `useAuth()` (derived from the server-side `user_roles` table) to conditionally render admin controls. Players will never see edit or delete buttons.

### Changes

**`src/pages/ChallengeDetail.tsx`**:
1. Import `isAdmin` from `useAuth`, `EditChallengeDialog`, `AlertDialog`, `useMutation`, `useQueryClient`, `Pencil` icon
2. Add `editOpen` and `deleteConfirmOpen` state
3. Add a delete mutation (`supabase.from('challenges').delete().eq('id', id)`) that navigates to `/challenges` on success
4. Render an admin action bar (only when `isAdmin === true`) below the hero with **Edit** and **Delete** buttons
5. Render `EditChallengeDialog` and a delete confirmation `AlertDialog` at the bottom

The admin bar will use a simple guard: `{isAdmin && ( ... )}` — no player will ever see these controls.

No database changes needed — existing RLS policies already restrict writes to admin/moderator roles only.

