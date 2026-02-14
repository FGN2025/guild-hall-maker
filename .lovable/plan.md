

## Add darcy@fgn.gg as Super Admin

### Overview
Insert darcy@fgn.gg (user ID: `84d2999e-0eae-4a52-b508-a0aafc6c84d7`) into the `user_roles` table with the `admin` role.

### What Changes
- Insert a single row into `public.user_roles` to grant the admin role to this user
- No code changes needed -- once the row exists, the existing `AuthContext` and `AdminRoute` logic will recognize them as an admin

### Technical Details
Run this SQL statement:
```text
INSERT INTO public.user_roles (user_id, role)
VALUES ('84d2999e-0eae-4a52-b508-a0aafc6c84d7', 'admin');
```

This will be executed using the database migration tool. After this, darcy@fgn.gg will see the "Admin" link in the navbar and have full access to the admin panel at `/admin`.

