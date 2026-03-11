

## Delete Test User for Registration Testing

The user `darcylorincz@gmail.com` (ID: `0f11ba49-b83e-4f3d-b53b-3b9bcdd46c25`, display name: "Reg Test 2") needs to be fully removed.

### Steps

1. **Create temporary edge function** `delete-test-user` that uses `supabase.auth.admin.deleteUser()` with the service role key to delete the auth user (cascade removes profiles row automatically)
2. **Invoke the function** to execute the deletion
3. **Clean up** — delete the temporary edge function
4. **Verify** the user no longer exists in profiles or auth

### Technical Detail
- User ID: `0f11ba49-b83e-4f3d-b53b-3b9bcdd46c25`
- The `ON DELETE CASCADE` on `profiles.user_id` will automatically remove the profile row
- Any rows in `user_service_interests`, `user_roles`, `tenant_admins` with cascade references will also be cleaned

