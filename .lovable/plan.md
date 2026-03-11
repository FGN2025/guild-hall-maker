

## Remove Test User `darcylorincz@gmail.com`

**User ID:** `28cb2d7e-87f0-441f-b9d2-73c86c0b1853` (display name: "Registration Test")

**Related records:** Only a `profiles` row exists — no bypass requests, notifications, roles, or service interests this time.

### Plan

Since profiles has `ON DELETE CASCADE` from auth.users, we only need one step:

1. **Delete the auth user** via a temporary edge function call using `auth.admin.deleteUser('28cb2d7e-87f0-441f-b9d2-73c86c0b1853')` — this will cascade-delete the profile row automatically.

We'll reuse the same approach as last time: create a temporary `delete-test-user` edge function, invoke it, then remove it.

