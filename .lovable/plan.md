

## Add "Resend Confirmation" Button to Admin Users Page

### Problem
Admins currently have no way to resend email verification to unconfirmed users from the UI. The `resend-confirmation` edge function already exists but can only be invoked manually.

### Approach
We need to know which users are unconfirmed so we can show the button selectively. Since `email_confirmed_at` lives in `auth.users` (not accessible from the client), we'll add a small edge function that checks confirmation status and returns it, OR we query it server-side within the existing `resend-confirmation` function. The simpler approach: add a `resendConfirmation` mutation to `useAdminUsers` that calls the existing edge function, and add a button in each user's row. Since we can't know confirmation status client-side, we'll show the button for all non-self users and let the function handle it gracefully.

**Better approach**: Create a lightweight edge function `check-user-confirmed` that accepts a list of user IDs and returns which ones are confirmed (using the service role key to query `auth.users`). This lets us show the button only for unconfirmed users.

Actually, the simplest and most practical approach: just add a "Resend" icon button in the Actions column for every user (except self). If the user is already confirmed, the edge function can return a message saying so. This avoids needing a new edge function just for status checks.

### Changes

1. **`src/hooks/useAdminUsers.ts`** — Add a `resendConfirmation` mutation that calls `supabase.functions.invoke('resend-confirmation', { body: { email } })`. We need to fetch user emails. Currently the hook doesn't have emails. We need to get emails from profiles or pass the user_id to the edge function.

   Looking at the edge function, it accepts `{ email }`. But we don't have emails in the admin users list. Two options:
   - Update the edge function to also accept `user_id` and look up the email server-side
   - Add email to the `AdminUser` interface by querying profiles (but profiles don't store email)

   Best: Update `resend-confirmation` to accept either `email` or `user_id`, and look up the email from `auth.users` via the service role client when only `user_id` is provided.

2. **`supabase/functions/resend-confirmation/index.ts`** — Accept `{ email }` OR `{ user_id }`. When `user_id` is provided, look up the email from `auth.users`. Also add a check: if user is already confirmed, return a message saying so instead of sending the email.

3. **`src/hooks/useAdminUsers.ts`** — Add `resendConfirmation` mutation using `user_id`.

4. **`src/pages/admin/AdminUsers.tsx`** — Add a "Resend Confirmation" icon button (Mail icon) next to the role selector for non-self users. Show loading state while sending. Add an "Actions" column or place it alongside the role selector.

### File Summary

| File | Change |
|------|--------|
| `supabase/functions/resend-confirmation/index.ts` | Accept `user_id`, look up email, check if already confirmed |
| `src/hooks/useAdminUsers.ts` | Add `resendConfirmation` mutation |
| `src/pages/admin/AdminUsers.tsx` | Add resend button in each user row |

