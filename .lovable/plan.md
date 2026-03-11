

## Remove Test User `darcylorincz@gmail.com`

The user `6a6d5b1e-d2ab-4644-ad5e-f33bf07d25c9` has the following records:
- 1 profile row
- 1 discord_bypass_requests row (the one you just approved)
- 1 notification row
- Auth user entry (email confirmed)

### Plan

1. **Delete related public schema rows** via a migration that cascades from the profile and cleans up bypass requests and notifications:
   - `DELETE FROM discord_bypass_requests WHERE user_id = '6a6d5b1e-...'`
   - `DELETE FROM notifications WHERE user_id = '6a6d5b1e-...'`
   - `DELETE FROM profiles WHERE user_id = '6a6d5b1e-...'`

2. **Delete the auth user** using the Auth Admin API via an edge function call (since `DELETE FROM auth.users` is not permitted via standard migrations). We will invoke `supabase.auth.admin.deleteUser()` from an existing or ad-hoc mechanism.

Since most foreign keys reference `auth.users` with `ON DELETE CASCADE`, deleting the auth user should cascade to profiles, notifications, etc. So the cleanest approach is a single auth admin deletion.

### Implementation
- Create a one-time edge function invocation (or use the existing admin tooling) to call `auth.admin.deleteUser('6a6d5b1e-d2ab-4644-ad5e-f33bf07d25c9')`.
- Verify the `profiles` table FK has `ON DELETE CASCADE` — if so, only the auth deletion is needed.
- Clean up `discord_bypass_requests` separately if it doesn't cascade (it references `auth.users` but may not have cascade).

Single step: Write a small edge function or use `supabase--curl_edge_functions` to delete the user via the service role key.

