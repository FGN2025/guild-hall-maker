

## Remove Test User Data for darcylorincz@gmail.com

The email exists only as database records, not in code. To fully reset this user for a fresh test, we need to delete data from these tables (in dependency order):

### Tables to clean (using the data insert/update/delete tool)

1. **`tenant_invitations`** — remove any pending or claimed invitations for this email
2. **`user_service_interests`** — remove any lead records linked to this user
3. **`tenant_admins`** — remove any tenant role assignments
4. **`profiles`** — remove the profile row
5. **`user_roles`** — remove any platform roles
6. **`auth.users`** — delete the auth account itself (requires admin API or dashboard)

### Execution

Since we cannot modify `auth.users` via SQL migrations, the approach is:
- Use the data tool to delete from `tenant_invitations`, `user_service_interests`, `tenant_admins`, `profiles`, and `user_roles` by matching on email or user_id
- First query to find the user_id from `profiles` where the email matches, then cascade deletes
- For the `auth.users` deletion, we'll need to use the Supabase admin API via an edge function or the backend management tools

### Steps
1. Query the user's ID from `auth.users` (via a read query)
2. Delete related records from all public tables using that user_id
3. Delete the auth user record
4. Re-insert a fresh `tenant_invitations` row if needed for testing

