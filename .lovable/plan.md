
# Configurable Discord Role Assignment — Completed

## What was built

### Database
- **`discord_role_mappings`** table with columns: `id`, `discord_role_id`, `discord_role_name`, `trigger_condition` (enum: on_link, on_achievement, on_rank, on_tournament_win, manual), `condition_value`, `platform_role` (nullable text: admin, moderator, tenant_admin, user — NULL = all users), `is_active`, `created_at`
- Admin-only RLS policies

### Edge Functions
- **`discord-server-roles`**: Fetches available roles from the FGN Discord server via bot API. Admin-authenticated.
- **`discord-oauth-callback`** (updated): Queries `discord_role_mappings` for all active `on_link` mappings, fetches the linking user's platform roles from `user_roles` and `tenant_admins`, and assigns only matching Discord roles. Falls back to `DISCORD_VERIFIED_ROLE_ID` if no mappings exist.

### Admin UI
- **`DiscordRoleManager`** component on the Ecosystem admin page
- Fetch server roles button, role + trigger + platform role selector, add/toggle/delete mappings
- Platform role options: All Users, Admin, Moderator, Tenant Admin, Regular User

---

# Delete & Ban Users — Completed

## What was built

### Database
- **`banned_users`** table: stores permanently banned emails (`email` UNIQUE, `banned_by`, `reason`, `created_at`)
- Admin-only RLS policy via `has_role()`

### Edge Functions
- **`delete-user`**: Admin-authenticated cascade delete of all user data across 20+ tables, nullifies match_results references, deletes auth user via admin API. Optionally inserts email into `banned_users` when `ban: true`.
- **`check-ban-status`**: Lightweight unauthenticated check — returns `{ banned: true/false }` for a given email.

### Admin UI
- Trash icon (delete) and Ban icon on each user row in Admin User Management
- Both protected by destructive ConfirmDialog with clear messaging
- Disabled for current user's own row
- Loading states during mutations

### Auth Flow
- Pre-signup ban check in Auth.tsx — blocked emails see "This account has been permanently banned" error before `signUp()` is called

---

# Phase 3: Subscriber Cloud Gaming Seat Purchases — Completed

## What was built

### Database
- **`subscriber_cloud_purchases`** table: tracks Stripe subscription per cloud gaming seat assignment (tenant_id, subscriber_id, user_id, stripe_subscription_id, status, timestamps)
- RLS policies: tenant members can view, tenant admins can insert/update
- `updated_at` trigger via `update_updated_at_column()`

### Hook
- **`useCloudGamingSeats`**: queries active seats from `subscriber_cloud_access` and purchases from `subscriber_cloud_purchases`, provides `assignSeat` (inserts access + purchase records, triggers Stripe checkout), `revokeSeat` (deactivates seat), and computed `availableSlots`/`availableSubscribers`

### UI
- **`CloudGamingSeatsCard`**: capacity bar, integration notice (Blacknut pending), subscriber picker for seat assignment, seats table with status badges and revoke action via ConfirmDialog
- Rendered in TenantSettings below CloudGamingConfigCard when cloud gaming is enabled
