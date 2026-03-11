

## Role-Based Discord Role Assignment

Currently the `discord_role_mappings` table uses `trigger_condition` (on_link, on_achievement, etc.) but has no concept of **which platform role** the user holds. All users who link Discord get the same role(s). You want different Discord roles assigned based on whether the linking user is an admin, moderator, tenant admin, or regular user.

### Approach

Add a `platform_role` column to `discord_role_mappings` so each mapping can optionally target a specific platform role. The callback will check the user's roles and assign only the matching Discord roles.

### Changes

**1. Database migration** — add `platform_role` column:
```sql
ALTER TABLE discord_role_mappings
  ADD COLUMN platform_role text DEFAULT NULL;
-- NULL = applies to all users (current behavior)
-- Values: 'admin', 'moderator', 'tenant_admin', 'user'
```

**2. Update `discord-oauth-callback`** — after updating the profile, query the user's platform roles from `user_roles` and `tenant_admins`, then filter mappings:
- Fetch all active `on_link` mappings
- Fetch the user's roles from `user_roles` and check `tenant_admins`
- For each mapping: assign if `platform_role IS NULL` (all users) OR if it matches a role the user holds
- Keep existing fallback to `DISCORD_VERIFIED_ROLE_ID`

**3. Update `DiscordRoleManager` UI** — add a "Platform Role" selector to the add-mapping form:
- Options: "All Users" (null), "Admin", "Moderator", "Tenant Admin", "Regular User"
- Display the platform role as a badge on each mapping row
- Save the value in `platform_role` column

### Example Configuration
| Discord Role | Trigger | Platform Role |
|---|---|---|
| FGN Verified | On Discord Link | All Users |
| FGN Staff | On Discord Link | Admin |
| FGN Moderator | On Discord Link | Moderator |
| Partner Admin | On Discord Link | Tenant Admin |

### Files to modify
- **New migration**: Add `platform_role` column to `discord_role_mappings`
- **`supabase/functions/discord-oauth-callback/index.ts`**: Query user roles and filter mappings
- **`src/components/admin/DiscordRoleManager.tsx`**: Add platform role selector and display

